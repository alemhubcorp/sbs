import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from './prisma.service.js';

const listApprovalsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'needs_more_info']).optional(),
  module: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export interface CreateApprovalInput {
  module: string;
  approvalType: string;
  tenantId?: string | null;
  subjectType: string;
  subjectId: string;
  requestedByUserId?: string | null;
  requiredRoleCode?: string | null;
  reason?: string | null;
  payload: Prisma.InputJsonValue;
}

export interface ApprovalDecisionInput {
  approvalId: string;
  decidedByUserId?: string | null;
  comment?: string | null;
}

@Injectable()
export class ApprovalService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  create(input: CreateApprovalInput) {
    return this.prismaService.client.approval.create({
      data: {
        module: input.module,
        approvalType: input.approvalType,
        tenantId: input.tenantId ?? null,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        requestedByUserId: input.requestedByUserId ?? null,
        requiredRoleCode: input.requiredRoleCode ?? null,
        reason: input.reason ?? null,
        payload: input.payload
      }
    });
  }

  async getPendingBySubject(subjectType: string, subjectId: string, approvalType: string) {
    return this.prismaService.client.approval.findFirst({
      where: {
        subjectType,
        subjectId,
        approvalType,
        status: 'pending'
      }
    });
  }

  list(query: unknown) {
    const { status, module, page, limit } = listApprovalsSchema.parse(query);
    const where: {
      status?: 'pending' | 'approved' | 'rejected' | 'needs_more_info';
      module?: string;
    } = {};

    if (status) {
      where.status = status;
    }

    if (module) {
      where.module = module;
    }

    return this.prismaService.client.approval.findMany({
      where,
      include: {
        requestedByUser: true,
        decidedByUser: true
      },
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit
    });
  }

  async getById(id: string) {
    const approval = await this.prismaService.client.approval.findUnique({
      where: { id },
      include: {
        requestedByUser: true,
        decidedByUser: true
      }
    });

    if (!approval) {
      throw new NotFoundException(`Approval ${id} was not found.`);
    }

    return approval;
  }

  markApproved(input: ApprovalDecisionInput) {
    return this.prismaService.client.approval.update({
      where: { id: input.approvalId },
      data: {
        status: 'approved',
        decidedByUserId: input.decidedByUserId ?? null,
        decisionComment: input.comment ?? null,
        decidedAt: new Date()
      }
    });
  }

  markRejected(input: ApprovalDecisionInput) {
    return this.prismaService.client.approval.update({
      where: { id: input.approvalId },
      data: {
        status: 'rejected',
        decidedByUserId: input.decidedByUserId ?? null,
        decisionComment: input.comment ?? null,
        decidedAt: new Date()
      }
    });
  }

  markNeedsMoreInfo(input: ApprovalDecisionInput) {
    return this.prismaService.client.approval.update({
      where: { id: input.approvalId },
      data: {
        status: 'needs_more_info',
        decidedByUserId: input.decidedByUserId ?? null,
        decisionComment: input.comment ?? null,
        decidedAt: new Date()
      }
    });
  }
}
