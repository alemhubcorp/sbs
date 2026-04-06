import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ApprovalPolicyRule {
  approvalType: string;
  enabled: boolean;
  requiredRoleCode: string;
  reason: string;
}

const DEFAULT_RULES: ApprovalPolicyRule[] = [
  {
    approvalType: 'wholesale.quote.accept',
    enabled: true,
    requiredRoleCode: 'platform_admin',
    reason: 'Accepting a quote creates a wholesale deal.'
  },
  {
    approvalType: 'contract.status.activate',
    enabled: true,
    requiredRoleCode: 'platform_admin',
    reason: 'Contract activation requires approval.'
  },
  {
    approvalType: 'payment.release',
    enabled: true,
    requiredRoleCode: 'platform_admin',
    reason: 'Releasing held funds requires approval.'
  },
  {
    approvalType: 'payment.refund',
    enabled: true,
    requiredRoleCode: 'platform_admin',
    reason: 'Refunding funds requires approval.'
  },
  {
    approvalType: 'logistics.deal.selection',
    enabled: true,
    requiredRoleCode: 'platform_admin',
    reason: 'Selecting a logistics provider requires approval.'
  }
];

@Injectable()
export class ApprovalPolicyService {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  getRule(approvalType: string) {
    const overrides = this.getOverrides();
    const override = overrides.find((rule) => rule.approvalType === approvalType);
    const fallback = DEFAULT_RULES.find((rule) => rule.approvalType === approvalType);

    return override ?? fallback ?? null;
  }

  requiresApproval(approvalType: string) {
    return this.getRule(approvalType)?.enabled ?? false;
  }

  private getOverrides() {
    const rawOverrides = this.configService.get<string>('APPROVAL_POLICY_OVERRIDES') ?? process.env.APPROVAL_POLICY_OVERRIDES;

    if (!rawOverrides) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawOverrides) as ApprovalPolicyRule[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
