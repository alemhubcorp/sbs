import type { ActorRole } from "./escrow.js";
import type { Money } from "./money.js";

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'awaiting_response'
  | 'resolved'
  | 'rejected'
  | 'escalated';

export type DisputeOutcome = 'release_to_seller' | 'refund_to_buyer' | 'split_settlement' | 'manual_review';

export interface DisputeCase {
  id: string;
  agreementId: string;
  openedBy: ActorRole;
  status: DisputeStatus;
  summary: string;
  claimedAmount?: Money;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DisputeResolution {
  disputeId: string;
  decidedBy: ActorRole;
  outcome: DisputeOutcome;
  notes: string;
  decidedAt: string;
}

export interface CreateDisputeInput {
  agreementId: string;
  openedBy: ActorRole;
  summary: string;
  claimedAmount?: Money;
  evidenceIds: string[];
}
