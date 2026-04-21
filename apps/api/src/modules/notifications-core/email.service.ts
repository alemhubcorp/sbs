import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { AuditService } from '../audit-observability/audit.service.js';
import { adminSettingKeys, getBoolean, getNumber, getString, isPlainObject } from '../admin-ops/admin-ops.defaults.js';
import { PrismaService } from '../../app/prisma.service.js';

type EmailPayload = Record<string, unknown>;

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  supportEmail: string;
  supportPhone: string;
  enabled: boolean;
};

type SmtpResponse = {
  code: number;
  lines: string[];
};

class SmtpSession {
  private readonly logger = new Logger(SmtpSession.name);
  private socket: net.Socket | tls.TLSSocket;
  private buffer = '';
  private waiting: Array<(response: SmtpResponse) => void> = [];
  private closed = false;

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    this.socket.setEncoding('utf8');
    this.socket.on('data', (chunk) => this.handleData(chunk));
    this.socket.on('close', () => {
      this.closed = true;
      this.flushError(new Error('SMTP connection closed.'));
    });
    this.socket.on('error', (error) => {
      this.logger.warn(`SMTP socket error: ${error instanceof Error ? error.message : 'unknown error'}`);
      this.flushError(error instanceof Error ? error : new Error('SMTP socket error.'));
    });
  }

  static async connect(config: SmtpConfig) {
    const socket = config.secure
      ? tls.connect({
          host: config.host,
          port: config.port,
          servername: config.host,
          rejectUnauthorized: false
        })
      : net.connect({
          host: config.host,
          port: config.port
        });

    const session = new SmtpSession(socket);
    await session.waitForGreeting();
    return session;
  }

  async startTls(servername: string) {
    if (this.socket instanceof tls.TLSSocket) {
      return;
    }

    const upgraded = tls.connect({
      socket: this.socket,
      servername,
      rejectUnauthorized: false
    });

    this.socket.removeAllListeners('data');
    this.socket.removeAllListeners('close');
    this.socket.removeAllListeners('error');
    this.socket = upgraded;
    this.socket.setEncoding('utf8');
    this.socket.on('data', (chunk) => this.handleData(chunk));
    this.socket.on('close', () => {
      this.closed = true;
      this.flushError(new Error('SMTP connection closed.'));
    });
    this.socket.on('error', (error) => {
      this.logger.warn(`SMTP socket error: ${error instanceof Error ? error.message : 'unknown error'}`);
      this.flushError(error instanceof Error ? error : new Error('SMTP socket error.'));
    });
  }

  async command(command: string, expectedCodes: number[]) {
    if (this.closed) {
      throw new Error('SMTP connection is closed.');
    }

    this.socket.write(`${command}\r\n`);
    const response = await this.waitForResponse();
    if (!expectedCodes.includes(response.code)) {
      throw new Error(`Unexpected SMTP response for "${command}": ${response.code} ${response.lines.join(' | ')}`);
    }
    return response;
  }

  async sendMessage(message: string) {
    this.socket.write(`${message.replace(/\r?\n/g, '\r\n')}\r\n.\r\n`);
    const response = await this.waitForResponse();
    if (response.code !== 250) {
      throw new Error(`SMTP DATA rejected: ${response.code} ${response.lines.join(' | ')}`);
    }
    return response;
  }

  close() {
    try {
      this.socket.end();
    } catch {
      // ignore
    }
  }

  private async waitForGreeting() {
    const response = await this.waitForResponse();
    if (response.code !== 220) {
      throw new Error(`SMTP greeting rejected: ${response.code} ${response.lines.join(' | ')}`);
    }
    return response;
  }

  private waitForResponse() {
    return new Promise<SmtpResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.waiting = this.waiting.filter((entry) => entry !== resolve);
        reject(new Error('SMTP request timed out.'));
      }, 10_000);

      const wrappedResolve = (response: SmtpResponse) => {
        clearTimeout(timeout);
        resolve(response);
      };

      this.waiting.push(wrappedResolve);
    });
  }

  private handleData(chunk: string) {
    this.buffer += chunk;

    while (true) {
      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }

      const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, '');
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (!line || !/^\d{3}[ -]/.test(line)) {
        continue;
      }

      const code = Number(line.slice(0, 3));
      const separator = line[3];
      const message = line.slice(4);
      const response: SmtpResponse = { code, lines: [message] };

      if (separator === ' ') {
        const resolve = this.waiting.shift();
        if (resolve) {
          resolve(response);
        }
      } else {
        const multiline = [message];
        while (true) {
          const nextIndex = this.buffer.indexOf('\n');
          if (nextIndex === -1) {
            this.buffer = `${line}\n${this.buffer}`;
            return;
          }

          const nextLine = this.buffer.slice(0, nextIndex).replace(/\r$/, '');
          this.buffer = this.buffer.slice(nextIndex + 1);
          const nextMatch = /^\d{3}[ -]/.exec(nextLine);
          if (!nextMatch) {
            multiline.push(nextLine);
            continue;
          }

          multiline.push(nextLine.slice(4));
          if (nextLine[3] === ' ') {
            const resolve = this.waiting.shift();
            if (resolve) {
              resolve({ code, lines: multiline });
            }
            break;
          }
        }
      }
    }
  }

  private flushError(error: Error) {
    const pending = [...this.waiting];
    this.waiting = [];
    for (const resolve of pending) {
      // resolve queue with a failure-like state by throwing from caller on next await
      resolve({ code: 421, lines: [error.message] });
    }
  }
}

function buildMimeMessage(config: SmtpConfig, eventType: string, user: { id: string; email?: string | null; name?: string | null }, payload: EmailPayload) {
  const recipient = user.email ?? user.id;
  const subject = isPlainObject(payload) && typeof payload.subject === 'string' ? payload.subject : `[RuFlo] ${eventType}`;
  const title = isPlainObject(payload) && typeof payload.title === 'string' ? payload.title : eventType;
  const message = isPlainObject(payload) && typeof payload.message === 'string' ? payload.message : JSON.stringify(payload, null, 2);
  const lines = [
    `From: ${config.fromName} <${config.fromEmail}>`,
    `To: ${user.name ? `${user.name} <${recipient}>` : recipient}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    `Reply-To: ${config.replyToEmail || config.supportEmail || config.fromEmail}`,
    '',
    title,
    '',
    message,
    '',
    `Event: ${eventType}`,
    `Recipient: ${recipient}`,
    `Support: ${config.supportEmail} ${config.supportPhone ? `| ${config.supportPhone}` : ''}`.trim(),
    ''
  ];

  return lines.join('\r\n');
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  async sendEmail(
    eventType: string,
    user: { id: string; email?: string | null; name?: string | null },
    payload: EmailPayload
  ) {
    const config = await this.resolveConfig();
    const recipient = user.email ?? user.id;

    if (!config.enabled || !config.host) {
      await this.recordAttempt({
        eventType,
        recipient,
        status: 'disabled',
        transport: 'disabled',
        error: 'smtp_not_configured'
      });

      return {
        sent: false,
        transport: 'disabled' as const,
        reason: 'smtp_not_configured'
      };
    }

    try {
      const session = await SmtpSession.connect(config);
      await session.command(`EHLO ${this.getEhloHost()}`, [250]);

      if (!config.secure) {
        try {
          await session.command('STARTTLS', [220]);
          await session.startTls(config.host);
          await session.command(`EHLO ${this.getEhloHost()}`, [250]);
        } catch {
          // No STARTTLS on this server, continue with plain connection.
        }
      }

      if (config.user && config.pass) {
        const authPlain = Buffer.from(`\u0000${config.user}\u0000${config.pass}`).toString('base64');
        try {
          await session.command(`AUTH PLAIN ${authPlain}`, [235]);
        } catch {
          const user64 = Buffer.from(config.user).toString('base64');
          const pass64 = Buffer.from(config.pass).toString('base64');
          await session.command('AUTH LOGIN', [334]);
          await session.command(user64, [334]);
          await session.command(pass64, [235]);
        }
      }

      await session.command(`MAIL FROM:<${config.fromEmail}>`, [250]);
      await session.command(`RCPT TO:<${recipient}>`, [250, 251]);
      await session.command('DATA', [354]);
      await session.sendMessage(buildMimeMessage(config, eventType, user, payload));
      await session.command('QUIT', [221, 250]);
      session.close();

      await this.recordAttempt({
        eventType,
        recipient,
        status: 'sent',
        transport: 'smtp'
      });

      await this.auditService.record({
        module: 'notifications-core',
        eventType: 'email.sent',
        actorId: user.id,
        tenantId: null,
        correlationId: null,
        subjectType: 'email',
        subjectId: recipient,
        payload: {
          eventType,
          recipient,
          transport: 'smtp'
        }
      });

      return {
        sent: true,
        transport: 'smtp' as const,
        recipient,
        payload
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'smtp_delivery_failed';
      this.logger.warn(`Email delivery failed for ${recipient}: ${reason}`);

      await this.recordAttempt({
        eventType,
        recipient,
        status: 'failed',
        transport: 'smtp',
        error: reason
      });

      await this.auditService.record({
        module: 'notifications-core',
        eventType: 'email.failed',
        actorId: user.id,
        tenantId: null,
        correlationId: null,
        subjectType: 'email',
        subjectId: recipient,
        payload: {
          eventType,
          recipient,
          transport: 'smtp',
          error: reason
        }
      });

      return {
        sent: false,
        transport: 'smtp' as const,
        reason,
        recipient
      };
    }
  }

  async testConfiguration(recipientEmail: string) {
    return this.sendEmail('smtp.test', { id: recipientEmail, email: recipientEmail, name: 'SMTP Test' }, {
      subject: 'RuFlo SMTP test',
      title: 'SMTP test message',
      message: 'This is a test message from RuFlo marketplace.'
    });
  }

  private async resolveConfig(): Promise<SmtpConfig> {
    const setting = await this.prismaService.client.adminSetting.findUnique({
      where: { key: adminSettingKeys.email }
    });
    const config = (setting?.value as Prisma.JsonObject | null | undefined) ?? {};
    const envEnabled = process.env.SMTP_ENABLED === 'true';
    const envHost = process.env.SMTP_HOST ?? '';
    const envPort = Number(process.env.SMTP_PORT ?? 587);
    const envSecure = process.env.SMTP_SECURE === 'true';
    const envUser = process.env.SMTP_USER ?? '';
    const envPass = process.env.SMTP_PASS ?? '';
    const configuredHost = getString(config.smtpHost, '');
    const useStoredTransport = Boolean(configuredHost);

    return {
      enabled: getBoolean(config.enabled, false) || envEnabled,
      host: useStoredTransport ? configuredHost : envHost,
      port: useStoredTransport ? getNumber(config.smtpPort, envPort) : envPort,
      secure: useStoredTransport ? getBoolean(config.smtpSecure, envSecure) : envSecure,
      user: useStoredTransport ? getString(config.smtpUser, envUser) : envUser,
      pass: useStoredTransport ? getString(config.smtpPassword, envPass) : envPass,
      fromName: getString(config.fromName, 'RuFlo Marketplace'),
      fromEmail: getString(config.fromEmail, process.env.SMTP_FROM ?? 'noreply@ruflo.local'),
      replyToEmail: getString(config.replyToEmail, process.env.SMTP_REPLY_TO ?? 'support@ruflo.local'),
      supportEmail: getString(config.supportEmail, process.env.SMTP_SUPPORT_EMAIL ?? 'support@ruflo.local'),
      supportPhone: getString(config.supportPhone, process.env.SMTP_SUPPORT_PHONE ?? ''),
    };
  }

  private getEhloHost() {
    return process.env.SMTP_EHLO_HOST ?? 'localhost';
  }

  private async recordAttempt(input: { eventType: string; recipient: string; status: string; transport: string; error?: string }) {
    try {
      const setting = await this.prismaService.client.adminSetting.findUnique({
        where: { key: adminSettingKeys.email }
      });
      const value = (setting?.value as Prisma.JsonObject | null | undefined) ?? {};
      const nextValue = {
        ...value,
        lastAttemptAt: new Date().toISOString(),
        lastAttemptStatus: input.status,
        lastAttemptTransport: input.transport,
        lastAttemptRecipient: input.recipient,
        lastAttemptEventType: input.eventType,
        ...(input.error ? { lastAttemptError: input.error } : {})
      };

      await this.prismaService.client.adminSetting.upsert({
        where: { key: adminSettingKeys.email },
        update: {
          value: nextValue
        },
        create: {
          key: adminSettingKeys.email,
          section: 'email',
          value: nextValue
        }
      });
    } catch (error) {
      this.logger.warn(`Unable to persist SMTP attempt: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
}
