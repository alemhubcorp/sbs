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

@Injectable()
export class AuditRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async record(input: RecordAuditEventInput) {
    const id = randomUUID();
    const payload = JSON.stringify(input.payload);

    await this.prismaService.client.$executeRaw(
      Prisma.sql`
        INSERT INTO "AuditEvent"
          ("id", "module", "eventType", "tenantId", "correlationId", "actorId", "subjectType", "subjectId", "payload", "createdAt")
        VALUES
          (${id}, ${input.module}, ${input.eventType}, ${input.tenantId ?? null}, ${input.correlationId ?? null}, ${input.actorId ?? null}, ${input.subjectType ?? null}, ${input.subjectId ?? null}, ${payload}::jsonb, NOW())
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
}
