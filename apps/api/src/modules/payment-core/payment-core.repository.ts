import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../app/prisma.service.js';
import type {
  PaymentAttemptPayload,
  PaymentRecordPayload,
  PaymentRecordStatus
} from '../../services/payment/payment.types.js';

const paymentRecordInclude = {
  retailOrder: true,
  deal: {
    include: {
      rfq: true,
      quote: true
    }
  },
  attempts: {
    orderBy: {
      createdAt: 'desc' as const
    }
  }
} satisfies Prisma.PaymentRecordInclude;

export type PaymentRecordRow = Prisma.PaymentRecordGetPayload<{
  include: typeof paymentRecordInclude;
}>;

@Injectable()
export class PaymentCoreRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  listPayments() {
    return this.prismaService.client.paymentRecord.findMany({
      include: paymentRecordInclude,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getPaymentById(id: string) {
    const record = await this.prismaService.client.paymentRecord.findUnique({
      where: { id },
      include: paymentRecordInclude
    });

    if (!record) {
      throw new NotFoundException(`Payment record ${id} was not found.`);
    }

    return record;
  }

  async getPaymentByOrderId(orderId: string) {
    return this.prismaService.client.paymentRecord.findFirst({
      where: {
        scope: 'order',
        orderId
      },
      include: paymentRecordInclude,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getPaymentByDealId(dealId: string) {
    return this.prismaService.client.paymentRecord.findFirst({
      where: {
        scope: 'deal',
        dealId
      },
      include: paymentRecordInclude,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async upsertPaymentRecord(input: PaymentRecordPayload) {
    const where = input.scope === 'order' ? { orderId: input.orderId ?? null } : { dealId: input.dealId ?? null };
    const existing = await this.prismaService.client.paymentRecord.findFirst({
      where: {
        scope: input.scope,
        ...(where.orderId !== undefined ? { orderId: where.orderId } : {}),
        ...(where.dealId !== undefined ? { dealId: where.dealId } : {})
      }
    });

    const payload = {
      scope: input.scope,
      ...(input.orderId ? { orderId: input.orderId } : {}),
      ...(input.dealId ? { dealId: input.dealId } : {}),
      amountMinor: input.amountMinor,
      currency: input.currency,
      method: input.method,
      provider: input.provider,
      status: input.status,
      ...(input.externalId ? { externalId: input.externalId } : {}),
      ...(input.transactionId ? { transactionId: input.transactionId } : {}),
      ...(input.bankReference ? { bankReference: input.bankReference } : {}),
      ...(input.paymentReference ? { paymentReference: input.paymentReference } : {}),
      ...(input.instructions ? { instructions: input.instructions } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {})
    } satisfies Prisma.PaymentRecordUncheckedCreateInput;

    if (existing) {
      return this.prismaService.client.paymentRecord.update({
        where: { id: existing.id },
        data: payload,
        include: paymentRecordInclude
      });
    }

    return this.prismaService.client.paymentRecord.create({
      data: payload,
      include: paymentRecordInclude
    });
  }

  async updatePaymentRecord(
    id: string,
    input: Partial<Pick<PaymentRecordPayload, 'status' | 'externalId' | 'transactionId' | 'bankReference' | 'paymentReference' | 'instructions' | 'metadata'>> & {
      status?: PaymentRecordStatus;
    }
  ) {
    await this.getPaymentById(id);
    const data: Prisma.PaymentRecordUpdateInput = {};

    if (input.status !== undefined) {
      data.status = input.status;
    }

    if (input.externalId !== undefined) {
      data.externalId = input.externalId;
    }

    if (input.transactionId !== undefined) {
      data.transactionId = input.transactionId;
    }

    if (input.bankReference !== undefined) {
      data.bankReference = input.bankReference;
    }

    if (input.paymentReference !== undefined) {
      data.paymentReference = input.paymentReference;
    }

    if (input.instructions !== undefined) {
      data.instructions = input.instructions === null ? Prisma.JsonNull : input.instructions;
    }

    if (input.metadata !== undefined) {
      data.metadata = input.metadata === null ? Prisma.JsonNull : input.metadata;
    }

    return this.prismaService.client.paymentRecord.update({
      where: { id },
      data,
      include: paymentRecordInclude
    });
  }

  async createAttempt(input: PaymentAttemptPayload) {
    return this.prismaService.client.paymentAttempt.create({
      data: {
        id: randomUUID(),
        paymentRecordId: input.paymentRecordId,
        attemptType: input.attemptType,
        method: input.method,
        provider: input.provider,
        status: input.status,
        amountMinor: input.amountMinor,
        currency: input.currency,
        ...(input.externalId ? { externalId: input.externalId } : {}),
        ...(input.transactionId ? { transactionId: input.transactionId } : {}),
        ...(input.bankReference ? { bankReference: input.bankReference } : {}),
        ...(input.paymentReference ? { paymentReference: input.paymentReference } : {}),
        ...(input.note ? { note: input.note } : {}),
        ...(input.payload ? { payload: input.payload } : {})
      },
      include: {
        paymentRecord: true
      }
    });
  }

  async getPaymentHistory(paymentRecordId: string) {
    return this.prismaService.client.paymentAttempt.findMany({
      where: {
        paymentRecordId
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  async ensurePaymentRecord(paymentRecordId: string) {
    const record = await this.prismaService.client.paymentRecord.findUnique({
      where: { id: paymentRecordId },
      select: { id: true }
    });

    if (!record) {
      throw new NotFoundException(`Payment record ${paymentRecordId} was not found.`);
    }

    return record;
  }

  async setStatus(id: string, status: PaymentRecordStatus) {
    await this.getPaymentById(id);
    return this.prismaService.client.paymentRecord.update({
      where: { id },
      data: { status },
      include: paymentRecordInclude
    });
  }

  async linkToOrder(orderId: string) {
    const existing = await this.getPaymentByOrderId(orderId);
    if (existing) {
      return existing;
    }
    return null;
  }

  async linkToDeal(dealId: string) {
    const existing = await this.getPaymentByDealId(dealId);
    if (existing) {
      return existing;
    }
    return null;
  }
}
