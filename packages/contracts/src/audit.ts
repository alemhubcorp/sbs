import type { ActorRole } from "./escrow.js";

export type AuditAction =
  | 'escrow.created'
  | 'escrow.funded'
  | 'escrow.released'
  | 'escrow.refunded'
  | 'dispute.opened'
  | 'dispute.resolved'
  | 'risk.flagged'
  | 'risk.cleared'
  | 'admin.overrode';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actorRole: ActorRole;
  actorId: string;
  subjectType: 'escrow' | 'dispute' | 'risk_flag' | 'user';
  subjectId: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}
