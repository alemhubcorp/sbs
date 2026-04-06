import type { EscrowAgreement, RiskFlag, RiskSeverity, RiskFlagType } from "@ruflo/contracts";

function severityForAmount(amount: number): RiskSeverity {
  if (amount >= 100000) {
    return "critical";
  }

  if (amount >= 25000) {
    return "high";
  }

  if (amount >= 5000) {
    return "medium";
  }

  return "low";
}

function maybeAdd(
  flags: RiskFlag[],
  enabled: boolean,
  type: RiskFlagType,
  severity: RiskSeverity,
  message: string,
  escrowId: string
) {
  if (!enabled) {
    return;
  }

  flags.push({
    id: `${escrowId}:${type}`,
    subjectType: "escrow",
    subjectId: escrowId,
    type,
    severity,
    message,
    active: true,
    createdAt: new Date().toISOString()
  });
}

export function createRiskAssessment(escrow: EscrowAgreement): RiskFlag[] {
  const amount = Number.parseFloat(escrow.amount.amount);
  const flags: RiskFlag[] = [];

  maybeAdd(
    flags,
    amount >= 25000,
    "manual_review",
    severityForAmount(amount),
    "High-value escrow requires manual operations review.",
    escrow.id
  );

  maybeAdd(
    flags,
    escrow.releaseConditions.some((condition) => condition.type === "admin_override"),
    "beneficiary_change",
    "high",
    "Admin override release condition present.",
    escrow.id
  );

  maybeAdd(
    flags,
    escrow.releaseConditions.length === 0,
    "manual_review",
    "critical",
    "Escrow created without release conditions.",
    escrow.id
  );

  return flags;
}
