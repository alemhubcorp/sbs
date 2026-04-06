export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export type RiskFlagType =
  | 'velocity'
  | 'chargeback_history'
  | 'identity_mismatch'
  | 'beneficiary_change'
  | 'manual_review'
  | 'sanctions_screening'
  | 'dispute_pattern';

export interface RiskFlag {
  id: string;
  subjectType: 'escrow' | 'user' | 'organization';
  subjectId: string;
  type: RiskFlagType;
  severity: RiskSeverity;
  message: string;
  active: boolean;
  createdAt: string;
  resolvedAt?: string;
}
