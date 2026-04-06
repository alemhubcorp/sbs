import type { Money } from './money.js';

export type ActorRole = 'buyer' | 'seller' | 'admin';

export type EscrowStatus =
  | 'draft'
  | 'funded'
  | 'held'
  | 'release_pending'
  | 'released'
  | 'refund_pending'
  | 'refunded'
  | 'disputed'
  | 'cancelled';

export type ReleaseConditionType =
  | 'manual'
  | 'milestone'
  | 'delivery_confirmation'
  | 'time_lock'
  | 'admin_override';

export interface EscrowParticipant {
  userId: string;
  role: ActorRole;
  displayName: string;
}

export interface ReleaseCondition {
  id: string;
  type: ReleaseConditionType;
  description: string;
  satisfied: boolean;
  satisfiedAt?: string;
}

export interface EscrowAgreement {
  id: string;
  reference: string;
  buyer: EscrowParticipant;
  seller: EscrowParticipant;
  amount: Money;
  status: EscrowStatus;
  releaseConditions: ReleaseCondition[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface EscrowHoldRequest {
  agreementId: string;
  buyerId: string;
  sellerId: string;
  amount: Money;
  releaseConditions: ReleaseCondition[];
  reference?: string;
}

export interface ReleaseFundsRequest {
  agreementId: string;
  requestedBy: ActorRole;
  reason?: string;
  evidenceIds?: string[];
}

export interface RefundRequest {
  agreementId: string;
  requestedBy: ActorRole;
  reason: string;
  evidenceIds?: string[];
  requestedAt?: string;
}

export interface CreateEscrowInput extends EscrowHoldRequest {}

export interface RecordFundingInput {
  paymentReference: string;
  fundedAt?: string;
}

export interface RecordReleaseApprovalInput {
  approvedBy: ActorRole;
  approvedAt?: string;
}

export interface RequestRefundInput extends RefundRequest {}
