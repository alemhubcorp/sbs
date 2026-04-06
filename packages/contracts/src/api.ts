import type { AuditLogEntry } from "./audit.js";
import type { CreateDisputeInput, DisputeCase, DisputeResolution } from "./dispute.js";
import type {
  CreateEscrowInput,
  EscrowAgreement,
  RecordFundingInput,
  RecordReleaseApprovalInput,
  RequestRefundInput
} from "./escrow.js";
import type { RiskFlag } from "./risk.js";

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
}

export interface EscrowApi {
  createHold(request: CreateEscrowInput): Promise<EscrowAgreement>;
  fundEscrow(request: RecordFundingInput): Promise<EscrowAgreement>;
  requestRelease(request: RecordReleaseApprovalInput): Promise<EscrowAgreement>;
  requestRefund(request: RequestRefundInput): Promise<EscrowAgreement>;
  getEscrow(agreementId: string): Promise<EscrowAgreement | null>;
}

export interface DisputeApi {
  openDispute(input: CreateDisputeInput): Promise<DisputeCase>;
  resolveDispute(input: DisputeResolution): Promise<DisputeCase>;
}

export interface AdminApi {
  listAudits(cursor?: string): Promise<PaginatedResponse<AuditLogEntry>>;
  listRiskFlags(cursor?: string): Promise<PaginatedResponse<RiskFlag>>;
  overrideEscrow(agreementId: string, reason: string): Promise<EscrowAgreement>;
}
