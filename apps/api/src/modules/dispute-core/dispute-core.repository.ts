import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../app/prisma.service.js';

export interface CreateDisputeInput {
  dealId?: string | undefined;
  paymentTransactionId?: string | undefined;
  disputeType: 'payment' | 'document' | 'commercial';
  reason: string;
}

@Injectable()
export class DisputeCoreRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  listDisputes() {
    return this.prismaService.client.disputeCase.findMany({
      include: {
        deal: true,
        paymentTransaction: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getDisputeById(id: string) {
    const dispute = await this.prismaService.client.disputeCase.findUnique({
      where: { id },
      include: {
        deal: true,
        paymentTransaction: true
      }
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute ${id} was not found.`);
    }

    return dispute;
  }

  async createDispute(input: CreateDisputeInput) {
    if (input.dealId) {
      const deal = await this.prismaService.client.wholesaleDeal.findUnique({
        where: { id: input.dealId },
        select: { id: true }
      });

      if (!deal) {
        throw new NotFoundException(`Deal ${input.dealId} was not found.`);
      }
    }

    if (input.paymentTransactionId) {
      const paymentTransaction = await this.prismaService.client.paymentTransaction.findUnique({
        where: { id: input.paymentTransactionId },
        select: { id: true }
      });

      if (!paymentTransaction) {
        throw new NotFoundException(`Payment transaction ${input.paymentTransactionId} was not found.`);
      }
    }

    return this.prismaService.client.$transaction(async (tx) => {
      const dispute = await tx.disputeCase.create({
        data: {
          ...(input.dealId ? { dealId: input.dealId } : {}),
          ...(input.paymentTransactionId ? { paymentTransactionId: input.paymentTransactionId } : {}),
          disputeType: input.disputeType,
          reason: input.reason
        },
        include: {
          deal: true,
          paymentTransaction: true
        }
      });

      if (input.paymentTransactionId) {
        await tx.paymentTransaction.update({
          where: { id: input.paymentTransactionId },
          data: {
            status: 'disputed'
          }
        });
      }

      return dispute;
    });
  }

  async updateDisputeStatus(id: string, status: 'open' | 'under_review' | 'resolved' | 'rejected') {
    await this.getDisputeById(id);

    return this.prismaService.client.disputeCase.update({
      where: { id },
      data: { status },
      include: {
        deal: true,
        paymentTransaction: true
      }
    });
  }
}
