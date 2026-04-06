import { randomUUID } from 'crypto';

import type {
  ActorRef,
  AuditLogEntry,
  AuditSeverity,
  EntityType,
  EscrowAggregate,
} from "./types.js";

export interface AuditInput {
  entityType: EntityType;
  entityId: string;
  actor: ActorRef;
  action: string;
  severity?: AuditSeverity;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  id?: string;
}

export function createAuditLogEntry(input: AuditInput): AuditLogEntry {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id: input.id ?? randomUUID(),
    entityType: input.entityType,
    entityId: input.entityId,
    actorId: input.actor.id,
    actorRole: input.actor.role,
    action: input.action,
    severity: input.severity ?? 'info',
    createdAt,
    metadata: input.metadata ?? {},
  };
}

export function appendAuditLog(escrow: EscrowAggregate, entry: AuditLogEntry): EscrowAggregate {
  return {
    ...escrow,
    auditLog: [...escrow.auditLog, entry],
    updatedAt: entry.createdAt,
  };
}
