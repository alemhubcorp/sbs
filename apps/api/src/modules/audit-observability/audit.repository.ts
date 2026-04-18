import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../app/prisma.service.js';

export interface RecordAuditEventInput {
  module: string;
  eventType: string;
  actorId?: string | null;
  tenantId?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  correlationId?: string | null;
  payload: Record<string, unknown>;
}

function resolveActorType(module: string, actorId?: string | null) {
  if (!actorId) {
    return 'system';
  }

  if (module.startsWith('admin')) {
    return 'admin';
  }

  return 'user';
}

@Injectable()
export class AuditRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async record(input: RecordAuditEventInput) {
    const id = randomUUID();
    const auditLogId = randomUUID();
    const payload = JSON.stringify(input.payload);
    const actorType = resolveActorType(input.module, input.actorId);

    await this.prismaService.client.$executeRaw(
      Prisma.sql`
        INSERT INTO "AuditEvent"
          ("id", "module", "eventType", "tenantId", "correlationId", "actorId", "subjectType", "subjectId", "payload", "createdAt")
        VALUES
          (${id}, ${input.module}, ${input.eventType}, ${input.tenantId ?? null}, ${input.correlationId ?? null}, ${input.actorId ?? null}, ${input.subjectType ?? null}, ${input.subjectId ?? null}, ${payload}::jsonb, NOW())
      `
    );

    await this.prismaService.client.$executeRaw(
      Prisma.sql`
        INSERT INTO "audit_log"
          ("id", "entityType", "entityId", "action", "actor", "actorId", "metadata", "createdAt")
        VALUES
          (${auditLogId}, ${input.subjectType ?? input.module}, ${input.subjectId ?? input.correlationId ?? id}, ${input.eventType}, ${actorType}, ${input.actorId ?? null}, ${payload}::jsonb, NOW())
      `
    );

    return this.getById(id);
  }

  async getById(id: string) {
    const rows = await this.prismaService.client.$queryRaw<
      Array<{
        id: string;
        module: string;
        eventType: string;
        tenantId: string | null;
        correlationId: string | null;
        actorId: string | null;
        subjectType: string | null;
        subjectId: string | null;
        payload: Prisma.JsonValue;
        createdAt: Date;
      }>
    >(Prisma.sql`SELECT * FROM "AuditEvent" WHERE "id" = ${id} LIMIT 1`);

    return rows[0] ?? null;
  }

  async list(limit: number) {
    return this.prismaService.client.$queryRaw<
      Array<{
        id: string;
        module: string;
        eventType: string;
        tenantId: string | null;
        correlationId: string | null;
        actorId: string | null;
        subjectType: string | null;
        subjectId: string | null;
        payload: Prisma.JsonValue;
        createdAt: Date;
      }>
    >(Prisma.sql`SELECT * FROM "AuditEvent" ORDER BY "createdAt" DESC LIMIT ${limit}`);
  }

  async listBySubject(subjectType: string, subjectId: string, limit = 100) {
    return this.prismaService.client.$queryRaw<
      Array<{
        id: string;
        module: string;
        eventType: string;
        tenantId: string | null;
        correlationId: string | null;
        actorId: string | null;
        subjectType: string | null;
        subjectId: string | null;
        payload: Prisma.JsonValue;
        createdAt: Date;
      }>
    >(Prisma.sql`
      SELECT *
      FROM "AuditEvent"
      WHERE "subjectType" = ${subjectType}
        AND "subjectId" = ${subjectId}
      ORDER BY "createdAt" ASC
      LIMIT ${limit}
    `);
  }
}
