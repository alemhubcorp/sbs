import { randomUUID } from 'crypto';

import { appendAuditLog, createAuditLogEntry } from './audit.js';
import type {
  ActorRef,
  ActorRole,
  CreateEscrowInput,
  DisputeOutcomeType,
  EscrowAggregate,
  EscrowDispute,
  Money,
  ReleaseCondition,
  ReleaseConditionType,
  RiskFlag,
  RiskFlagInput,
  ResolveDisputeInput,
} from './types.js';

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeMoney(amount: Money): Money {
  if (!Number.isInteger(amount.amountMinor) || amount.amountMinor <= 0) {
    throw new Error('Escrow amount must be a positive integer in minor units.');
  }
  const currency = amount.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error('Escrow currency must be a 3-letter ISO code.');
  }
  return { amountMinor: amount.amountMinor, currency };
}

function ensureDistinctParties(buyerId: string, sellerId: string): void {
  if (!buyerId.trim() || !sellerId.trim()) {
    throw new Error('Buyer and seller ids are required.');
  }
  if (buyerId === sellerId) {
    throw new Error('Buyer and seller must be different parties.');
  }
}

function safeMetadata(value?: Record<string, unknown>): Record<string, unknown> {
  return value ? { ...value } : {};
}

function defaultReleaseConditions(): ReleaseCondition[] {
  return [
    {
      id: randomUUID(),
      type: 'manual_review',
      required: true,
      satisfied: false,
    },
  ];
}

function canActorSatisfyCondition(role: ActorRole, type: ReleaseConditionType): boolean {
  switch (type) {
    case 'buyer_acceptance':
      return role === 'buyer' || role === 'admin';
    case 'seller_delivery_confirmation':
    case 'milestone_completed':
      return role === 'seller' || role === 'admin';
    case 'document_verification':
    case 'time_lock_expired':
    case 'admin_clearance':
    case 'manual_review':
      return role === 'admin';
    default:
      return false;
  }
}

function assertEditable(escrow: EscrowAggregate): void {
  if (['released', 'refunded', 'cancelled', 'partially_refunded'].includes(escrow.status)) {
    throw new Error(`Escrow is already settled with status "${escrow.status}".`);
  }
}

function hasBlockingRisk(escrow: EscrowAggregate): boolean {
  return escrow.riskFlags.some((flag) => flag.status === 'open' && flag.blocking);
}

function getRequiredConditions(escrow: EscrowAggregate): ReleaseCondition[] {
  return escrow.releaseConditions.filter((condition) => condition.required);
}

function hasOpenDispute(escrow: EscrowAggregate): boolean {
  return Boolean(escrow.dispute && escrow.dispute.status !== 'resolved' && escrow.dispute.status !== 'rejected');
}

export function createEscrow(input: CreateEscrowInput): EscrowAggregate {
  ensureDistinctParties(input.buyerId, input.sellerId);
  const createdAt = input.createdAt ?? nowIso();
  const amount = normalizeMoney(input.amount);
  const releaseConditions = (input.releaseConditions?.length ? input.releaseConditions : defaultReleaseConditions()).map(
    (condition) => ({
      ...condition,
      id: condition.id || randomUUID(),
      satisfied: Boolean(condition.satisfied),
    }),
  );

  const escrow: EscrowAggregate = {
    id: input.id ?? randomUUID(),
    tenantId: input.tenantId,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    amount,
    status: 'pending_funding',
    releaseConditions,
    riskFlags: [],
    auditLog: [],
    metadata: safeMetadata(input.metadata),
    createdAt,
    updatedAt: createdAt,
  };

  return appendAuditLog(
    escrow,
    createAuditLogEntry({
      entityType: 'escrow',
      entityId: escrow.id,
      actor: { id: input.buyerId, role: 'buyer' },
      action: 'escrow.created',
      severity: 'info',
      createdAt,
      metadata: {
        tenantId: input.tenantId,
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        amountMinor: amount.amountMinor,
        currency: amount.currency,
      },
    }),
  );
}

export function fundEscrow(escrow: EscrowAggregate, actor: ActorRef, fundedAt = nowIso()): EscrowAggregate {
  assertEditable(escrow);
  if (escrow.status !== 'pending_funding') {
    throw new Error('Escrow can only be funded while pending funding.');
  }
  if (actor.role !== 'buyer' && actor.role !== 'admin') {
    throw new Error('Only the buyer or an admin can fund escrow.');
  }

  const next = {
    ...escrow,
    status: 'funded' as const,
    fundedAt,
    updatedAt: fundedAt,
  };

  return appendAuditLog(
    next,
    createAuditLogEntry({
      entityType: 'escrow',
      entityId: escrow.id,
      actor,
      action: 'escrow.funded',
      severity: 'info',
      createdAt: fundedAt,
    }),
  );
}

export function satisfyReleaseCondition(
  escrow: EscrowAggregate,
  actor: ActorRef,
  conditionId: string,
  evidence: Record<string, unknown> = {},
  satisfiedAt = nowIso(),
): EscrowAggregate {
  assertEditable(escrow);
  const conditionIndex = escrow.releaseConditions.findIndex((condition) => condition.id === conditionId);
  if (conditionIndex === -1) {
    throw new Error('Release condition not found.');
  }

  const condition = escrow.releaseConditions[conditionIndex];
  if (condition.satisfied) {
    return escrow;
  }
  if (!canActorSatisfyCondition(actor.role, condition.type)) {
    throw new Error(`Actor role "${actor.role}" cannot satisfy release condition "${condition.type}".`);
  }

  const releaseConditions = [...escrow.releaseConditions];
  releaseConditions[conditionIndex] = {
    ...condition,
    satisfied: true,
    satisfiedAt,
    satisfiedBy: actor.role,
    evidence,
  };

  const next = {
    ...escrow,
    releaseConditions,
    updatedAt: satisfiedAt,
  };

  return appendAuditLog(
    next,
    createAuditLogEntry({
      entityType: 'release_condition',
      entityId: conditionId,
      actor,
      action: 'release_condition.satisfied',
      severity: 'info',
      createdAt: satisfiedAt,
      metadata: { escrowId: escrow.id, type: condition.type, evidence },
    }),
  );
}

export function canReleaseEscrow(escrow: EscrowAggregate): boolean {
  if (escrow.status !== 'funded') return false;
  if (hasBlockingRisk(escrow)) return false;
  if (hasOpenDispute(escrow)) return false;
  return getRequiredConditions(escrow).every((condition) => condition.satisfied);
}

export function getBlockedReleaseReasons(escrow: EscrowAggregate): string[] {
  const reasons: string[] = [];
  if (escrow.status !== 'funded') {
    reasons.push(`Escrow status is ${escrow.status}.`);
  }
  if (hasBlockingRisk(escrow)) {
    reasons.push('One or more blocking risk flags are open.');
  }
  if (hasOpenDispute(escrow)) {
    reasons.push('Escrow has an active dispute.');
  }
  for (const condition of getRequiredConditions(escrow)) {
    if (!condition.satisfied) {
      reasons.push(`Required condition "${condition.type}" is not satisfied.`);
    }
  }
  return reasons;
}

export function releaseEscrow(
  escrow: EscrowAggregate,
  actor: ActorRef,
  releasedAt = nowIso(),
): EscrowAggregate {
  assertEditable(escrow);
  if (actor.role !== 'buyer' && actor.role !== 'admin') {
    throw new Error('Only the buyer or an admin can authorize release.');
  }
  if (!canReleaseEscrow(escrow)) {
    throw new Error(`Escrow cannot be released: ${getBlockedReleaseReasons(escrow).join(' ')}`);
  }

  const next = {
    ...escrow,
    status: 'released' as const,
    releasedAt,
    updatedAt: releasedAt,
  };

  return appendAuditLog(
    next,
    createAuditLogEntry({
      entityType: 'escrow',
      entityId: escrow.id,
      actor,
      action: 'escrow.released',
      severity: 'high',
      createdAt: releasedAt,
    }),
  );
}

export function refundEscrow(
  escrow: EscrowAggregate,
  actor: ActorRef,
  reason: string,
  refundedAt = nowIso(),
): EscrowAggregate {
  assertEditable(escrow);
  if (actor.role !== 'buyer' && actor.role !== 'admin') {
    throw new Error('Only the buyer or an admin can trigger a refund.');
  }
  if (escrow.status === 'released') {
    throw new Error('Released escrow cannot be refunded.');
  }

  const next = {
    ...escrow,
    status: 'refunded' as const,
    refundedAt,
    updatedAt: refundedAt,
  };

  return appendAuditLog(
    next,
    createAuditLogEntry({
      entityType: 'escrow',
      entityId: escrow.id,
      actor,
      action: 'escrow.refunded',
      severity: 'high',
      createdAt: refundedAt,
      metadata: { reason },
    }),
  );
}

export function openDispute(
  escrow: EscrowAggregate,
  actor: ActorRef,
  reason: string,
  notes?: string,
  openedAt = nowIso(),
): EscrowAggregate {
  assertEditable(escrow);
  if (escrow.dispute && escrow.dispute.status === 'open') {
    return escrow;
  }
  if (actor.role !== 'buyer' && actor.role !== 'seller' && actor.role !== 'admin') {
    throw new Error('Invalid dispute actor.');
  }

  const dispute: EscrowDispute = {
    id: randomUUID(),
    openedBy: actor.id,
    openedByRole: actor.role,
    reason,
    status: 'open',
    openedAt,
    notes,
  };

  const next = {
    ...escrow,
    status: 'disputed' as const,
    dispute,
    updatedAt: openedAt,
  };

  return appendAuditLog(
    next,
    createAuditLogEntry({
      entityType: 'dispute',
      entityId: dispute.id,
      actor,
      action: 'dispute.opened',
      severity: 'high',
      createdAt: openedAt,
      metadata: { escrowId: escrow.id, reason, notes },
    }),
  );
}

export function addRiskFlag(
  escrow: EscrowAggregate,
  actor: ActorRef,
  input: RiskFlagInput,
): EscrowAggregate {
  assertEditable(escrow);
  const createdAt = input.createdAt ?? nowIso();
  const flag: RiskFlag = {
    id: input.id ?? randomUUID(),
    type: input.type,
    severity: input.severity,
    status: 'open',
    blocking: input.blocking ?? ['high', 'critical'].includes(input.severity),
    source: input.source,
    details: input.details ?? {},
    createdBy: actor.id,
    createdAt,
  };

  const next = {
    ...escrow,
    riskFlags: [...escrow.riskFlags, flag],
    updatedAt: createdAt,
  };

  return appendAuditLog(
    next,
    createAuditLogEntry({
      entityType: 'risk_flag',
      entityId: flag.id,
      actor,
      action: 'risk_flag.created',
      severity: 'warning',
      createdAt,
      metadata: {
        type: flag.type,
        severity: flag.severity,
        blocking: flag.blocking,
        source: flag.source,
        details: flag.details,
      },
    }),
  );
}

export function resolveRiskFlag(
  escrow: EscrowAggregate,
  actor: ActorRef,
  flagId: string,
  resolutionNotes: string,
  resolvedAt = nowIso(),
): EscrowAggregate {
  assertEditable(escrow);
  if (actor.role !== 'admin') {
    throw new Error('Only an admin can resolve risk flags.');
  }
  const flagIndex = escrow.riskFlags.findIndex((flag) => flag.id === flagId);
  if (flagIndex === -1) {
    throw new Error('Risk flag not found.');
  }

  const flag = escrow.riskFlags[flagIndex];
  if (flag.status !== 'open') {
    return escrow;
  }

  const riskFlags = [...escrow.riskFlags];
  riskFlags[flagIndex] = {
    ...flag,
    status: 'resolved',
    resolvedBy: actor.id,
    resolvedAt,
    resolutionNotes,
  };

  const next = {
    ...escrow,
    riskFlags,
    updatedAt: resolvedAt,
  };

  return appendAuditLog(
    next,
    createAuditLogEntry({
      entityType: 'risk_flag',
      entityId: flagId,
      actor,
      action: 'risk_flag.resolved',
      severity: 'info',
      createdAt: resolvedAt,
      metadata: { resolutionNotes },
    }),
  );
}

export function resolveDispute(
  escrow: EscrowAggregate,
  actor: ActorRef,
  input: ResolveDisputeInput,
): EscrowAggregate {
  assertEditable(escrow);
  if (actor.role !== 'admin') {
    throw new Error('Only an admin can resolve a dispute.');
  }
  if (!escrow.dispute) {
    throw new Error('No dispute is open for this escrow.');
  }

  const resolvedAt = input.resolvedAt ?? nowIso();
  const outcomeType: DisputeOutcomeType = input.outcome.type;

  const settleStatus =
    outcomeType === 'release'
      ? ('released' as const)
      : outcomeType === 'refund'
        ? ('refunded' as const)
        : outcomeType === 'partial_refund'
          ? ('partially_refunded' as const)
          : ('cancelled' as const);

  const dispute: EscrowDispute = {
    ...escrow.dispute,
    status: 'resolved',
    resolvedAt,
    resolvedBy: actor.id,
    outcome: input.outcome,
    notes: input.notes ?? input.outcome.notes,
  };

  const next = {
    ...escrow,
    status: settleStatus,
    dispute,
    releasedAt: outcomeType === 'release' ? resolvedAt : escrow.releasedAt,
    refundedAt: outcomeType === 'refund' || outcomeType === 'partial_refund' ? resolvedAt : escrow.refundedAt,
    cancelledAt: outcomeType === 'cancel' ? resolvedAt : escrow.cancelledAt,
    updatedAt: resolvedAt,
  };

  return appendAuditLog(
    next,
    createAuditLogEntry({
      entityType: 'dispute',
      entityId: dispute.id,
      actor,
      action: 'dispute.resolved',
      severity: outcomeType === 'release' ? 'high' : 'critical',
      createdAt: resolvedAt,
      metadata: {
        outcomeType,
        refundAmountMinor: input.outcome.refundAmountMinor,
        notes: input.notes ?? input.outcome.notes,
      },
    }),
  );
}

export function requiresManualReview(escrow: EscrowAggregate): boolean {
  return hasBlockingRisk(escrow) || hasOpenDispute(escrow);
}
