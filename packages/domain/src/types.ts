export const ACTOR_ROLES = ['buyer', 'seller', 'admin'] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];

export const ESCROW_STATUSES = [
  'draft',
  'pending_funding',
  'funded',
  'disputed',
  'released',
  'refunded',
  'partially_refunded',
  'cancelled',
] as const;
export type EscrowStatus = (typeof ESCROW_STATUSES)[number];

export const RELEASE_CONDITION_TYPES = [
  'manual_review',
  'buyer_acceptance',
  'seller_delivery_confirmation',
  'milestone_completed',
  'document_verification',
  'time_lock_expired',
  'admin_clearance',
] as const;
export type ReleaseConditionType = (typeof RELEASE_CONDITION_TYPES)[number];

export const DISPUTE_STATUSES = ['open', 'under_review', 'resolved', 'rejected'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const DISPUTE_OUTCOME_TYPES = ['release', 'refund', 'partial_refund', 'cancel'] as const;
export type DisputeOutcomeType = (typeof DISPUTE_OUTCOME_TYPES)[number];

export const RISK_FLAG_TYPES = [
  'kyc_mismatch',
  'payment_anomaly',
  'chargeback_risk',
  'dispute_spike',
  'sanctions_match',
  'manual_review',
] as const;
export type RiskFlagType = (typeof RISK_FLAG_TYPES)[number];

export const RISK_FLAG_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type RiskFlagSeverity = (typeof RISK_FLAG_SEVERITIES)[number];

export const AUDIT_SEVERITIES = ['info', 'warning', 'high', 'critical'] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export interface Money {
  amountMinor: number;
  currency: string;
}

export interface ReleaseCondition {
  id: string;
  type: ReleaseConditionType;
  required: boolean;
  satisfied: boolean;
  satisfiedAt?: string;
  satisfiedBy?: ActorRole;
  evidence?: Record<string, unknown>;
}

export interface DisputeOutcome {
  type: DisputeOutcomeType;
  refundAmountMinor?: number;
  notes?: string;
}

export interface EscrowDispute {
  id: string;
  openedBy: string;
  openedByRole: ActorRole;
  reason: string;
  status: DisputeStatus;
  openedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  outcome?: DisputeOutcome;
  notes?: string;
}

export interface RiskFlag {
  id: string;
  type: RiskFlagType;
  severity: RiskFlagSeverity;
  status: 'open' | 'resolved' | 'ignored';
  blocking: boolean;
  source: string;
  details: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export type EntityType = 'escrow' | 'dispute' | 'risk_flag' | 'release_condition';

export interface AuditLogEntry {
  id: string;
  entityType: EntityType;
  entityId: string;
  actorId: string;
  actorRole: ActorRole;
  action: string;
  severity: AuditSeverity;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface EscrowAggregate {
  id: string;
  tenantId: string;
  buyerId: string;
  sellerId: string;
  amount: Money;
  status: EscrowStatus;
  releaseConditions: ReleaseCondition[];
  riskFlags: RiskFlag[];
  auditLog: AuditLogEntry[];
  dispute?: EscrowDispute;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  fundedAt?: string;
  releasedAt?: string;
  refundedAt?: string;
  cancelledAt?: string;
}

export interface ActorRef {
  id: string;
  role: ActorRole;
}

export interface CreateEscrowInput {
  tenantId: string;
  buyerId: string;
  sellerId: string;
  amount: Money;
  releaseConditions?: ReleaseCondition[];
  metadata?: Record<string, unknown>;
  id?: string;
  createdAt?: string;
}

export interface RiskFlagInput {
  type: RiskFlagType;
  severity: RiskFlagSeverity;
  source: string;
  details?: Record<string, unknown>;
  blocking?: boolean;
  id?: string;
  createdAt?: string;
}

export interface ResolveDisputeInput {
  outcome: DisputeOutcome;
  notes?: string;
  resolvedAt?: string;
}

