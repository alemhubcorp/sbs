import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { adminSettingKeys, getString, isPlainObject } from '../admin-ops/admin-ops.defaults.js';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { ApprovalService } from '../../app/approval.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { NotificationService } from '../notifications-core/notification.service.js';
import { PrismaService } from '../../app/prisma.service.js';
import { ResourceAccessService } from '../../app/resource-access.service.js';

export type ComplianceScope = 'buyer_b2b' | 'supplier' | 'logistics' | 'customs';

type DocumentRequirement = {
  id: string;
  code: string;
  name: string;
  appliesTo: ComplianceScope[];
  required: boolean;
  allowedFileTypes: string[];
  helpText: string;
  active: boolean;
};

const requirementSchema = z.object({
  id: z.string().min(1).max(120),
  code: z.string().min(1).max(120).regex(/^[a-z0-9_.-]+$/),
  name: z.string().min(1).max(200),
  appliesTo: z.array(z.enum(['buyer_b2b', 'supplier', 'logistics', 'customs'])).min(1),
  required: z.boolean().default(true),
  allowedFileTypes: z.array(z.string().min(1).max(40)).default(['pdf']),
  helpText: z.string().min(1).max(500).default(''),
  active: z.boolean().default(true)
});

const requirementsDocumentSchema = z.object({
  requirements: z.array(requirementSchema).default([])
});

const profileUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(160).optional(),
  personalAddress: z.string().min(1).max(250).optional(),
  contactPerson: z.string().min(1).max(120).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(1).max(40).optional(),
  companyName: z.string().min(1).max(160).optional(),
  legalName: z.string().min(1).max(200).optional(),
  companyAddress: z.string().min(1).max(250).optional(),
  socialLinks: z
    .union([z.array(z.string().min(1).max(300)), z.record(z.string(), z.string().max(300)), z.null()])
    .optional(),
  supplierType: z.enum(['trader', 'manufacturer']).optional(),
  country: z.string().min(2).max(80).optional(),
  notes: z.string().max(1000).optional()
});

const submitSchema = profileUpdateSchema.extend({
  documentIds: z.array(z.string().min(1)).default([])
});

const uploadDocumentSchema = z.object({
  documentType: z.enum(['commercial', 'compliance', 'other']).default('compliance'),
  name: z.string().min(1).max(200),
  contentType: z.string().min(1).max(120).optional(),
  storageBucket: z.string().min(1).max(120),
  storageKey: z.string().min(1).max(500),
  sizeBytes: z.coerce.number().int().min(0).optional(),
  checksum: z.string().min(1).max(200).optional(),
  requirementCode: z.string().min(1).max(120),
  metadata: z.record(z.string(), z.unknown()).optional()
});

function normalizeRequirementDocument(value: unknown): DocumentRequirement[] {
  if (!isPlainObject(value) || !Array.isArray(value.requirements)) {
    return [];
  }

  return value.requirements
    .map((item) => requirementSchema.safeParse(item))
    .filter((entry): entry is { success: true; data: DocumentRequirement } => entry.success)
    .map((entry) => entry.data);
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === null || value === undefined) {
    return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return value as Prisma.InputJsonValue;
}

function isDocumentMetadata(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

function isPartnerScope(scope: ComplianceScope): scope is 'logistics' | 'customs' {
  return scope === 'logistics' || scope === 'customs';
}

@Injectable()
export class ComplianceCoreService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(ApprovalService) private readonly approvalService: ApprovalService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(NotificationService) private readonly notificationService: NotificationService,
    @Inject(ResourceAccessService) private readonly resourceAccessService: ResourceAccessService
  ) {}

  async getMe(authContext: AuthContext) {
    const scope = this.resolveScope(authContext);

    switch (scope) {
      case 'buyer_b2b':
        return this.buildBuyerState(authContext);
      case 'supplier':
        return this.buildSupplierState(authContext);
      case 'logistics':
      case 'customs':
        return this.buildOrganizationState(authContext, scope);
      default:
        throw new ForbiddenException('Compliance access is not available for this account.');
    }
  }

  async updateMe(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const scope = this.resolveScope(authContext);
    const parsed = profileUpdateSchema.parse(input);

    switch (scope) {
      case 'buyer_b2b':
        return this.updateBuyerProfile(parsed, auditContext, authContext);
      case 'supplier':
        return this.updateSellerProfile(parsed, auditContext, authContext);
      case 'logistics':
      case 'customs':
        return this.updateOrganizationProfile(parsed, auditContext, authContext);
      default:
        throw new ForbiddenException('Compliance access is not available for this account.');
    }
  }

  async submitMe(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const scope = this.resolveScope(authContext);
    const parsed = submitSchema.parse(input);

    switch (scope) {
      case 'buyer_b2b':
        return this.submitBuyerB2b(parsed, auditContext, authContext);
      case 'supplier':
        return this.submitSupplierOnboarding(parsed, auditContext, authContext);
      case 'logistics':
      case 'customs':
        return this.submitOrganizationOnboarding(parsed, auditContext, authContext);
      default:
        throw new ForbiddenException('Compliance access is not available for this account.');
    }
  }

  async uploadDocument(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const scope = this.resolveScope(authContext);
    const state = await this.getStateForScope(authContext, scope);
    const parsed = uploadDocumentSchema.parse(input);

    const requirement = state.requirements.find((item) => item.code === parsed.requirementCode);
    if (!requirement) {
      throw new BadRequestException(`Unknown requirement code: ${parsed.requirementCode}.`);
    }

    const document = await this.prismaService.client.document.create({
      data: {
        ...(state.profile.tenantId ? { tenantId: state.profile.tenantId } : {}),
        uploadedByUserId: this.requireUser(authContext),
        documentType: parsed.documentType,
        status: 'uploaded',
        name: parsed.name,
        ...(parsed.contentType ? { contentType: parsed.contentType } : {}),
        storageBucket: parsed.storageBucket,
        storageKey: parsed.storageKey,
        ...(typeof parsed.sizeBytes === 'number' ? { sizeBytes: parsed.sizeBytes } : {}),
        ...(parsed.checksum ? { checksum: parsed.checksum } : {}),
        metadata: toJsonValue({
          ...(parsed.metadata ?? {}),
          scope,
          profileId: state.profile.id,
          requirementCode: parsed.requirementCode,
          requirementName: requirement.name,
          uploadedAt: new Date().toISOString()
        })
      }
    });

    await this.auditService.record({
      module: 'compliance-core',
      eventType: 'compliance.document.uploaded',
      actorId: auditContext.actorId,
      tenantId: state.profile.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'document',
      subjectId: document.id,
      payload: {
        scope,
        profileId: state.profile.id,
        requirementCode: parsed.requirementCode,
        storageKey: document.storageKey
      }
    });

    return document;
  }

  async listDocumentRequirements(query: unknown) {
    const parsed = z
      .object({
        scope: z.enum(['buyer_b2b', 'supplier', 'logistics', 'customs']).optional()
      })
      .parse(query);
    const requirements = normalizeRequirementDocument(await this.getDocumentRequirementsSetting());
    return {
      items: parsed.scope ? requirements.filter((requirement) => requirement.appliesTo.includes(parsed.scope!)) : requirements
    };
  }

  async updateDocumentRequirements(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    this.ensureAdmin(authContext);
    const parsed = requirementsDocumentSchema.parse(input);
    await this.prismaService.client.adminSetting.upsert({
      where: { key: adminSettingKeys.kycDocumentRequirements },
      create: {
        key: adminSettingKeys.kycDocumentRequirements,
        section: 'compliance',
        value: parsed as Prisma.InputJsonValue,
        updatedByUserId: auditContext.actorId
      },
      update: {
        section: 'compliance',
        value: parsed as Prisma.InputJsonValue,
        updatedByUserId: auditContext.actorId
      }
    });

    await this.auditService.record({
      module: 'compliance-core',
      eventType: 'compliance.requirements.updated',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'admin-setting',
      subjectId: adminSettingKeys.kycDocumentRequirements,
      payload: {
        requirementCount: parsed.requirements.length
      }
    });

    return this.listDocumentRequirements({});
  }

  async applyApprovalDecision(
    approval: {
      approvalType: string;
      subjectType: string;
      subjectId: string;
      payload: Prisma.JsonValue;
      tenantId: string | null;
    },
    decision: 'approved' | 'rejected' | 'needs_more_info',
    auditContext: RequestAuditContext,
    note?: string | null
  ) {
    if (!approval.approvalType.startsWith('buyer.') && !approval.approvalType.startsWith('supplier.') && !approval.approvalType.startsWith('logistics.') && !approval.approvalType.startsWith('customs.')) {
      return null;
    }

    const comment = decision === 'approved' ? null : note ?? decision;
    const payload = isDocumentMetadata(approval.payload) ? approval.payload : {};
    const now = new Date();
    const resolvedDocuments = this.resolveApprovalDocumentIds(payload);

    switch (approval.approvalType) {
      case 'buyer.b2b.enable': {
        const profile = await this.prismaService.client.buyerProfile.findUnique({ where: { id: approval.subjectId } });
        if (!profile) {
          throw new NotFoundException(`Buyer profile ${approval.subjectId} was not found.`);
        }

        const updated = await this.prismaService.client.buyerProfile.update({
          where: { id: profile.id },
          data: {
            buyerType: decision === 'approved' ? 'business' : profile.buyerType,
            b2bStatus: decision,
            b2bReviewedAt: now,
            b2bReviewedByUserId: auditContext.actorId,
            b2bReviewNote: comment
          }
        });

        await this.updateApprovalDocuments(resolvedDocuments, decision);
        await this.notifyProfileOwner(profile.userId, `Buyer B2B verification ${decision}`, `Your buyer B2B verification was ${decision}.`);

        await this.auditService.record({
          module: 'compliance-core',
          eventType: `compliance.buyer-b2b.${decision}`,
          actorId: auditContext.actorId,
          tenantId: approval.tenantId,
          correlationId: auditContext.correlationId,
          subjectType: 'buyer-profile',
          subjectId: updated.id,
          payload: {
            b2bStatus: updated.b2bStatus
          }
        });

        return updated;
      }
      case 'supplier.onboarding': {
        const profile = await this.prismaService.client.sellerProfile.findUnique({ where: { id: approval.subjectId } });
        if (!profile) {
          throw new NotFoundException(`Seller profile ${approval.subjectId} was not found.`);
        }

        const updated = await this.prismaService.client.sellerProfile.update({
          where: { id: profile.id },
          data: {
            onboardingStatus: decision,
            reviewedAt: now,
            reviewedByUserId: auditContext.actorId,
            reviewNote: comment,
            ...(decision === 'approved' ? { status: 'active' as const } : {})
          }
        });

        await this.updateApprovalDocuments(resolvedDocuments, decision);
        await this.notifyProfileOwner(profile.userId, `Supplier onboarding ${decision}`, `Your supplier onboarding was ${decision}.`);

        await this.auditService.record({
          module: 'compliance-core',
          eventType: `compliance.supplier.${decision}`,
          actorId: auditContext.actorId,
          tenantId: approval.tenantId,
          correlationId: auditContext.correlationId,
          subjectType: 'seller-profile',
          subjectId: updated.id,
          payload: {
            onboardingStatus: updated.onboardingStatus,
            supplierType: updated.supplierType
          }
        });

        return updated;
      }
      case 'logistics.onboarding':
      case 'customs.onboarding': {
        const organization = await this.prismaService.client.organization.findUnique({ where: { id: approval.subjectId } });
        if (!organization) {
          throw new NotFoundException(`Organization ${approval.subjectId} was not found.`);
        }

        const updated = await this.prismaService.client.organization.update({
          where: { id: organization.id },
          data: {
            onboardingStatus: decision,
            reviewedAt: now,
            reviewedByUserId: auditContext.actorId,
            reviewNote: comment,
            ...(decision === 'approved' ? { status: 'active' as const } : decision === 'rejected' ? { status: 'inactive' as const } : {})
          }
        });

        await this.updateApprovalDocuments(resolvedDocuments, decision);
        await this.notifyProfileOwner(updated.linkedUserId, `${updated.partnerType ?? 'Partner'} onboarding ${decision}`, `Your partner onboarding was ${decision}.`);

        await this.auditService.record({
          module: 'compliance-core',
          eventType: `compliance.organization.${decision}`,
          actorId: auditContext.actorId,
          tenantId: approval.tenantId,
          correlationId: auditContext.correlationId,
          subjectType: 'organization',
          subjectId: updated.id,
          payload: {
            onboardingStatus: updated.onboardingStatus,
            partnerType: updated.partnerType
          }
        });

        return updated;
      }
      default:
        return null;
    }
  }

  async requireBuyerB2bApproval(authContext: AuthContext) {
    const state = await this.buildBuyerState(authContext);
    if (state.profile.b2bStatus !== 'approved') {
      throw new ForbiddenException('Buyer B2B approval is required for wholesale actions.');
    }
  }

  async requireSupplierApproval(authContext: AuthContext) {
    const state = await this.buildSupplierState(authContext);
    if (state.profile.onboardingStatus !== 'approved') {
      throw new ForbiddenException('Supplier onboarding approval is required for selling actions.');
    }
  }

  async requirePartnerApproval(authContext: AuthContext, expected: 'logistics' | 'customs') {
    const state = await this.buildOrganizationState(authContext, expected);
    if (state.profile.onboardingStatus !== 'approved') {
      throw new ForbiddenException('Partner onboarding approval is required before operating assignments.');
    }
  }

  private async buildBuyerState(authContext: AuthContext) {
    const userId = this.requireUser(authContext);
    const profile = await this.prismaService.client.buyerProfile.findFirst({
      where: { userId },
      include: {
        user: true,
        tenant: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!profile) {
      throw new NotFoundException('Buyer profile not found for the current user.');
    }

    const requirements = await this.getRequirementsForScope('buyer_b2b');
    const documents = await this.getDocumentsForScope(userId, 'buyer_b2b', profile.id);
    const pendingApproval = await this.approvalService.getPendingBySubject('buyer-profile', profile.id, 'buyer.b2b.enable');

    return {
      scope: 'buyer_b2b' as const,
      profile,
      requirements,
      documents,
      missingRequirements: this.findMissingRequirements(requirements, documents),
      pendingApproval,
      canBuyB2C: true,
      canBuyB2B: profile.b2bStatus === 'approved'
    };
  }

  private async getStateForScope(authContext: AuthContext, scope: ComplianceScope) {
    switch (scope) {
      case 'buyer_b2b':
        return this.buildBuyerState(authContext);
      case 'supplier':
        return this.buildSupplierState(authContext);
      case 'logistics':
      case 'customs':
        return this.buildOrganizationState(authContext, scope);
      default:
        throw new ForbiddenException('Compliance access is not available for this account.');
    }
  }

  private async buildSupplierState(authContext: AuthContext) {
    const userId = this.requireUser(authContext);
    const profile = await this.prismaService.client.sellerProfile.findFirst({
      where: { userId },
      include: {
        user: true,
        tenant: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!profile) {
      throw new NotFoundException('Supplier profile not found for the current user.');
    }

    const requirements = await this.getRequirementsForScope('supplier');
    const documents = await this.getDocumentsForScope(userId, 'supplier', profile.id);
    const pendingApproval = await this.approvalService.getPendingBySubject('seller-profile', profile.id, 'supplier.onboarding');

    return {
      scope: 'supplier' as const,
      profile,
      requirements,
      documents,
      missingRequirements: this.findMissingRequirements(requirements, documents),
      pendingApproval,
      canSell: profile.onboardingStatus === 'approved'
    };
  }

  private async buildOrganizationState(authContext: AuthContext, scope: 'logistics' | 'customs') {
    const userId = this.requireUser(authContext);
    const partnerType = scope === 'logistics' ? 'logistics_company' : 'customs_broker';
    const profile = await this.prismaService.client.organization.findFirst({
      where: {
        linkedUserId: userId,
        partnerType
      },
      include: {
        tenant: true,
        linkedUser: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!profile) {
      throw new NotFoundException(`${scope} organization not found for the current user.`);
    }

    const requirements = await this.getRequirementsForScope(scope);
    const documents = await this.getDocumentsForScope(userId, scope, profile.id);
    const pendingApproval = await this.approvalService.getPendingBySubject('organization', profile.id, `${scope}.onboarding`);

    return {
      scope,
      profile,
      requirements,
      documents,
      missingRequirements: this.findMissingRequirements(requirements, documents),
      pendingApproval,
      canOperate: profile.onboardingStatus === 'approved'
    };
  }

  private async updateBuyerProfile(input: z.infer<typeof profileUpdateSchema>, auditContext: RequestAuditContext, authContext: AuthContext) {
    const profile = await this.buildBuyerState(authContext);
    const userId = this.requireUser(authContext);
    const updated = await this.prismaService.client.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(input.firstName ? { firstName: input.firstName } : {}),
          ...(input.lastName ? { lastName: input.lastName } : {})
        }
      });

      return tx.buyerProfile.update({
        where: { id: profile.profile.id },
        data: {
          ...(input.displayName ? { displayName: input.displayName } : {}),
          ...(input.personalAddress !== undefined ? { personalAddress: input.personalAddress } : {}),
          ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
          ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
          ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
          ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
          ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
          ...(input.companyAddress !== undefined ? { companyAddress: input.companyAddress } : {}),
          ...(input.socialLinks !== undefined ? { socialLinks: toJsonValue(input.socialLinks) } : {}),
          ...(input.country !== undefined ? { status: profile.profile.status } : {})
        },
        include: {
          user: true,
          tenant: true
        }
      });
    });

    await this.auditService.record({
      module: 'compliance-core',
      eventType: 'compliance.buyer.updated',
      actorId: auditContext.actorId,
      tenantId: updated.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'buyer-profile',
      subjectId: updated.id,
      payload: {
        displayName: updated.displayName,
        b2bStatus: updated.b2bStatus
      }
    });

    return this.getMe(authContext);
  }

  private async updateSellerProfile(input: z.infer<typeof profileUpdateSchema>, auditContext: RequestAuditContext, authContext: AuthContext) {
    const state = await this.buildSupplierState(authContext);
    const userId = this.requireUser(authContext);
    const updated = await this.prismaService.client.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(input.firstName ? { firstName: input.firstName } : {}),
          ...(input.lastName ? { lastName: input.lastName } : {})
        }
      });

      return tx.sellerProfile.update({
        where: { id: state.profile.id },
        data: {
          ...(input.displayName ? { displayName: input.displayName } : {}),
          ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
          ...(input.companyAddress !== undefined ? { companyAddress: input.companyAddress } : {}),
          ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
          ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
          ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
          ...(input.socialLinks !== undefined ? { socialLinks: toJsonValue(input.socialLinks) } : {}),
          ...(input.country !== undefined ? { country: input.country } : {}),
          ...(input.supplierType ? { supplierType: input.supplierType } : {})
        },
        include: {
          user: true,
          tenant: true
        }
      });
    });

    await this.auditService.record({
      module: 'compliance-core',
      eventType: 'compliance.supplier.updated',
      actorId: auditContext.actorId,
      tenantId: updated.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'seller-profile',
      subjectId: updated.id,
      payload: {
        displayName: updated.displayName,
        onboardingStatus: updated.onboardingStatus
      }
    });

    return this.getMe(authContext);
  }

  private async updateOrganizationProfile(input: z.infer<typeof profileUpdateSchema>, auditContext: RequestAuditContext, authContext: AuthContext) {
    const scope = this.resolveScope(authContext);
    if (!isPartnerScope(scope)) {
      throw new ForbiddenException('Partner compliance access is not available for this account.');
    }
    const state = await this.buildOrganizationState(authContext, scope);
    const updated = await this.prismaService.client.organization.update({
      where: { id: state.profile.id },
      data: {
        ...(input.displayName ? { name: input.displayName } : {}),
        ...(input.companyName !== undefined ? { legalName: input.companyName } : {}),
        ...(input.contactPerson !== undefined ? { contactName: input.contactPerson } : {}),
        ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
        ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
        ...(input.companyAddress !== undefined ? { address: input.companyAddress } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.socialLinks !== undefined ? { socialLinks: toJsonValue(input.socialLinks) } : {})
      }
    });

    await this.auditService.record({
      module: 'compliance-core',
      eventType: 'compliance.organization.updated',
      actorId: auditContext.actorId,
      tenantId: updated.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'organization',
      subjectId: updated.id,
      payload: {
        name: updated.name,
        onboardingStatus: updated.onboardingStatus
      }
    });

    return this.getMe(authContext);
  }

  private async submitBuyerB2b(input: z.infer<typeof submitSchema>, auditContext: RequestAuditContext, authContext: AuthContext) {
    const state = await this.buildBuyerState(authContext);
    this.ensureRequirementsSatisfied('buyer_b2b', state.requirements, state.documents, input.documentIds);

    const approvalPayload = {
      profileId: state.profile.id,
      userId: state.profile.userId,
      fields: input,
      documentIds: input.documentIds,
      requirements: state.requirements
    };

    const existingApproval = await this.approvalService.getPendingBySubject('buyer-profile', state.profile.id, 'buyer.b2b.enable');
    const updatedProfile = await this.prismaService.client.buyerProfile.update({
      where: { id: state.profile.id },
      data: {
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.personalAddress !== undefined ? { personalAddress: input.personalAddress } : {}),
        ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
        ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
        ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
        ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
        ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
        ...(input.companyAddress !== undefined ? { companyAddress: input.companyAddress } : {}),
        ...(input.socialLinks !== undefined ? { socialLinks: toJsonValue(input.socialLinks) } : {}),
        b2bStatus: 'pending',
        b2bSubmittedAt: new Date(),
        b2bReviewedAt: null,
        b2bReviewedByUserId: null,
        b2bReviewNote: null
      }
    });

    const approval =
      existingApproval ??
      (await this.approvalService.create({
        module: 'compliance-core',
        approvalType: 'buyer.b2b.enable',
        tenantId: updatedProfile.tenantId,
        subjectType: 'buyer-profile',
        subjectId: updatedProfile.id,
        requestedByUserId: authContext.internalUserId,
        requiredRoleCode: 'platform_admin',
        reason: 'Buyer B2B enablement requires admin review.',
        payload: approvalPayload as Prisma.InputJsonValue
      }));

    await this.auditService.record({
      module: 'compliance-core',
      eventType: 'compliance.buyer-b2b.submitted',
      actorId: auditContext.actorId,
      tenantId: updatedProfile.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'buyer-profile',
      subjectId: updatedProfile.id,
      payload: {
        approvalId: approval.id,
        documentIds: input.documentIds
      }
    });

    await this.notifyProfileOwner(updatedProfile.userId, 'Buyer B2B verification submitted', 'Your buyer B2B verification request was submitted for admin review.');

    return {
      ...await this.buildBuyerState(authContext),
      approval
    };
  }

  private async submitSupplierOnboarding(input: z.infer<typeof submitSchema>, auditContext: RequestAuditContext, authContext: AuthContext) {
    const state = await this.buildSupplierState(authContext);
    this.ensureRequirementsSatisfied('supplier', state.requirements, state.documents, input.documentIds);

    const approvalPayload = {
      profileId: state.profile.id,
      userId: state.profile.userId,
      fields: input,
      documentIds: input.documentIds,
      requirements: state.requirements
    };

    const existingApproval = await this.approvalService.getPendingBySubject('seller-profile', state.profile.id, 'supplier.onboarding');
    const updatedProfile = await this.prismaService.client.sellerProfile.update({
      where: { id: state.profile.id },
      data: {
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
        ...(input.companyAddress !== undefined ? { companyAddress: input.companyAddress } : {}),
        ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
        ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
        ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
        ...(input.socialLinks !== undefined ? { socialLinks: toJsonValue(input.socialLinks) } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.supplierType ? { supplierType: input.supplierType } : {}),
        onboardingStatus: 'pending',
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNote: null
      }
    });

    const approval =
      existingApproval ??
      (await this.approvalService.create({
        module: 'compliance-core',
        approvalType: 'supplier.onboarding',
        tenantId: updatedProfile.tenantId,
        subjectType: 'seller-profile',
        subjectId: updatedProfile.id,
        requestedByUserId: authContext.internalUserId,
        requiredRoleCode: 'platform_admin',
        reason: 'Supplier onboarding requires admin review.',
        payload: approvalPayload as Prisma.InputJsonValue
      }));

    await this.auditService.record({
      module: 'compliance-core',
      eventType: 'compliance.supplier.submitted',
      actorId: auditContext.actorId,
      tenantId: updatedProfile.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'seller-profile',
      subjectId: updatedProfile.id,
      payload: {
        approvalId: approval.id,
        documentIds: input.documentIds
      }
    });

    await this.notifyProfileOwner(updatedProfile.userId, 'Supplier onboarding submitted', 'Your supplier onboarding request was submitted for admin review.');

    return {
      ...await this.buildSupplierState(authContext),
      approval
    };
  }

  private async submitOrganizationOnboarding(input: z.infer<typeof submitSchema>, auditContext: RequestAuditContext, authContext: AuthContext) {
    const scope = this.resolveScope(authContext);
    if (!isPartnerScope(scope)) {
      throw new ForbiddenException('Partner compliance access is not available for this account.');
    }
    const state = await this.buildOrganizationState(authContext, scope);
    this.ensureRequirementsSatisfied(scope, state.requirements, state.documents, input.documentIds);

    const approvalType = scope === 'logistics' ? 'logistics.onboarding' : 'customs.onboarding';
    const approvalPayload = {
      profileId: state.profile.id,
      userId: state.profile.linkedUserId,
      fields: input,
      documentIds: input.documentIds,
      requirements: state.requirements
    };

    const existingApproval = await this.approvalService.getPendingBySubject('organization', state.profile.id, approvalType);
    const updatedOrganization = await this.prismaService.client.organization.update({
      where: { id: state.profile.id },
      data: {
        ...(input.displayName ? { name: input.displayName } : {}),
        ...(input.companyName !== undefined ? { legalName: input.companyName } : {}),
        ...(input.contactPerson !== undefined ? { contactName: input.contactPerson } : {}),
        ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
        ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
        ...(input.companyAddress !== undefined ? { address: input.companyAddress } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.socialLinks !== undefined ? { socialLinks: toJsonValue(input.socialLinks) } : {}),
        onboardingStatus: 'pending',
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNote: null
      }
    });

    const approval =
      existingApproval ??
      (await this.approvalService.create({
        module: 'compliance-core',
        approvalType,
        tenantId: updatedOrganization.tenantId,
        subjectType: 'organization',
        subjectId: updatedOrganization.id,
        requestedByUserId: authContext.internalUserId,
        requiredRoleCode: 'platform_admin',
        reason: `${scope} onboarding requires admin review.`,
        payload: approvalPayload as Prisma.InputJsonValue
      }));

    await this.auditService.record({
      module: 'compliance-core',
      eventType: `compliance.${scope}.submitted`,
      actorId: auditContext.actorId,
      tenantId: updatedOrganization.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'organization',
      subjectId: updatedOrganization.id,
      payload: {
        approvalId: approval.id,
        documentIds: input.documentIds
      }
    });

    await this.notifyProfileOwner(updatedOrganization.linkedUserId, `${scope} onboarding submitted`, `Your ${scope} onboarding request was submitted for admin review.`);

    return {
      ...(await this.buildOrganizationState(authContext, scope)),
      approval
    };
  }

  private async getDocumentRequirementsSetting() {
    const setting = await this.prismaService.client.adminSetting.findUnique({
      where: { key: adminSettingKeys.kycDocumentRequirements }
    });

    return setting?.value ?? { requirements: [] };
  }

  private async getRequirementsForScope(scope: ComplianceScope) {
    return normalizeRequirementDocument(await this.getDocumentRequirementsSetting()).filter((requirement) => requirement.active && requirement.appliesTo.includes(scope));
  }

  private async getDocumentsForScope(userId: string, scope: ComplianceScope, profileId: string) {
    const documents = await this.prismaService.client.document.findMany({
      where: {
        uploadedByUserId: userId
      },
      orderBy: [{ createdAt: 'desc' }]
    });

    return documents.filter((document) => {
      const metadata = document.metadata;
      if (!isDocumentMetadata(metadata)) {
        return false;
      }

      return metadata.scope === scope && metadata.profileId === profileId;
    });
  }

  private findMissingRequirements(requirements: DocumentRequirement[], documents: Array<{ metadata: Prisma.JsonValue | null }>) {
    const documentCodes = new Set(
      documents
        .map((document) => (isDocumentMetadata(document.metadata) ? getString(document.metadata.requirementCode, '') : ''))
        .filter((code) => code.length > 0)
    );

    return requirements.filter((requirement) => requirement.required && !documentCodes.has(requirement.code));
  }

  private ensureRequirementsSatisfied(
    scope: ComplianceScope,
    requirements: DocumentRequirement[],
    documents: Array<{ metadata: Prisma.JsonValue | null }>,
    documentIds: string[]
  ) {
    const uploadedDocumentIds = new Set(documentIds);
    const documentMap = new Map<string, Prisma.JsonValue | null>();
    for (const document of documents) {
      if (isDocumentMetadata(document.metadata) && typeof document.metadata.documentId === 'string') {
        documentMap.set(document.metadata.documentId, document.metadata);
      }
    }

    for (const requirement of requirements) {
      if (!requirement.required) {
        continue;
      }

      const hasUploadedDoc = documents.some((document) => isDocumentMetadata(document.metadata) && getString(document.metadata.requirementCode, '') === requirement.code);
      if (!hasUploadedDoc && !uploadedDocumentIds.size) {
        throw new BadRequestException(`Missing required document: ${requirement.name}.`);
      }
    }
  }

  private resolveApprovalDocumentIds(payload: Record<string, unknown>) {
    const raw = payload.documentIds;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.filter((value): value is string => typeof value === 'string' && value.length > 0);
  }

  private async updateApprovalDocuments(documentIds: string[], status: 'approved' | 'rejected' | 'needs_more_info') {
    if (!documentIds.length) {
      return;
    }

    await this.prismaService.client.document.updateMany({
      where: {
        id: {
          in: documentIds
        }
      },
      data: {
        status: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'uploaded'
      }
    });
  }

  private async notifyProfileOwner(userId: string | null | undefined, title: string, message: string) {
    if (!userId) {
      return;
    }

    await this.notificationService.emitMany([userId], {
      type: 'compliance.onboarding.status',
      title,
      message,
      entityType: 'onboarding',
      entityId: userId,
      metadata: {
        title,
        message
      }
    });
  }

  private ensureAdmin(authContext: AuthContext) {
    if (!this.resourceAccessService.isPlatformAdmin(authContext)) {
      throw new ForbiddenException('Admin access is required.');
    }
  }

  private resolveScope(authContext: AuthContext): ComplianceScope {
    if (authContext.roles.includes('supplier_user')) {
      return 'supplier';
    }

    if (authContext.roles.includes('logistics_company')) {
      return 'logistics';
    }

    if (authContext.roles.includes('customs_broker')) {
      return 'customs';
    }

    if (authContext.roles.includes('customer_user')) {
      return 'buyer_b2b';
    }

    throw new ForbiddenException('A supported compliance role is required.');
  }

  private requireUser(authContext: AuthContext) {
    if (!authContext.internalUserId) {
      throw new ForbiddenException('Authentication is required.');
    }

    return authContext.internalUserId;
  }
}
