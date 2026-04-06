import type {
  ActorRole,
  CreateEscrowInput,
  DisputeOutcome,
  EscrowAgreement,
  EscrowParticipant,
  EscrowStatus,
  RecordFundingInput,
  RecordReleaseApprovalInput,
  RequestRefundInput
} from "@ruflo/contracts";

function nowIso() {
  return new Date().toISOString();
}

function makeParticipant(userId: string, role: ActorRole): EscrowParticipant {
  return {
    userId,
    role,
    displayName: `${role}:${userId}`
  };
}

function initialStatus(): EscrowStatus {
  return "draft";
}

interface AggregateState {
  agreement: EscrowAgreement;
  fundedAt?: string;
  releaseApprovals: Partial<Record<ActorRole, string>>;
  refundRequestedAt?: string;
  disputeOpenedAt?: string;
}

export class EscrowAggregate {
  private constructor(private readonly state: AggregateState) {}

  static create(input: CreateEscrowInput, actorId: string) {
    const timestamp = nowIso();
    const agreement: EscrowAgreement = {
      id: input.agreementId,
      reference: input.reference ?? `escrow-${input.agreementId}`,
      buyer: makeParticipant(input.buyerId, "buyer"),
      seller: makeParticipant(input.sellerId, "seller"),
      amount: input.amount,
      status: initialStatus(),
      releaseConditions: input.releaseConditions,
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: {
        createdBy: actorId
      }
    };

    return new EscrowAggregate({
      agreement,
      releaseApprovals: {}
    });
  }

  recordFunding(input: RecordFundingInput) {
    this.state.fundedAt = input.fundedAt ?? nowIso();
    this.state.agreement.status = "held";
    this.state.agreement.updatedAt = this.state.fundedAt;
    this.state.agreement.metadata = {
      ...this.state.agreement.metadata,
      fundingReference: input.paymentReference
    };
    return this;
  }

  recordReleaseApproval(input: RecordReleaseApprovalInput) {
    this.state.releaseApprovals[input.approvedBy] = input.approvedAt ?? nowIso();
    this.state.agreement.status = "release_pending";
    this.state.agreement.updatedAt = input.approvedAt ?? nowIso();

    const allConditionsSatisfied = this.state.agreement.releaseConditions.every((condition) => condition.satisfied);
    const buyerApproved = Boolean(this.state.releaseApprovals.buyer);
    const adminApproved = Boolean(this.state.releaseApprovals.admin);

    if (adminApproved || (buyerApproved && allConditionsSatisfied)) {
      this.state.agreement.status = "released";
    }

    return this;
  }

  requestRefund(input: RequestRefundInput) {
    this.state.refundRequestedAt = input.requestedAt ?? nowIso();
    this.state.agreement.status = "refund_pending";
    this.state.agreement.updatedAt = this.state.refundRequestedAt;
    this.state.agreement.metadata = {
      ...this.state.agreement.metadata,
      refundReason: input.reason
    };
    return this;
  }

  openDispute(summary: string) {
    this.state.disputeOpenedAt = nowIso();
    this.state.agreement.status = "disputed";
    this.state.agreement.updatedAt = this.state.disputeOpenedAt;
    this.state.agreement.metadata = {
      ...this.state.agreement.metadata,
      disputeSummary: summary
    };
    return this;
  }

  resolveDispute(outcome: DisputeOutcome) {
    if (outcome === "refund_to_buyer") {
      this.state.agreement.status = "refunded";
    } else if (outcome === "release_to_seller" || outcome === "split_settlement") {
      this.state.agreement.status = "released";
    } else {
      this.state.agreement.status = "disputed";
    }

    this.state.agreement.updatedAt = nowIso();
    return this;
  }

  snapshot() {
    return {
      ...this.state.agreement,
      metadata: {
        ...this.state.agreement.metadata,
        fundedAt: this.state.fundedAt,
        refundRequestedAt: this.state.refundRequestedAt,
        disputeOpenedAt: this.state.disputeOpenedAt,
        releaseApprovals: this.state.releaseApprovals
      }
    };
  }
}
