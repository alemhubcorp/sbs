import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../app/prisma.service.js';

export interface CreatePaymentTransactionInput {
  dealId: string;
  currency: string;
  totalAmountMinor: number;
}

export interface UpdateEscrowAmountInput {
  paymentTransactionId: string;
  amountMinor?: number | undefined;
  note?: string | undefined;
}

type PaymentTransactionRow = {
  id: string;
  dealId: string;
  transactionType: 'wholesale_deal';
  status:
    | 'created'
    | 'held'
    | 'partially_released'
    | 'released'
    | 'refunded'
    | 'disputed'
    | 'cancelled';
  currency: string;
  totalAmountMinor: number;
  heldAmountMinor: number;
  releasedAmountMinor: number;
  refundedAmountMinor: number;
  createdAt: Date;
  updatedAt: Date;
};

type PaymentLedgerEntryRow = {
  id: string;
  paymentTransactionId: string;
  entryType: 'created' | 'hold' | 'release' | 'refund' | 'dispute';
  amountMinor: number;
  resultingHeldMinor: number;
  resultingReleasedMinor: number;
  resultingRefundedMinor: number;
  note: string | null;
  createdAt: Date;
};

@Injectable()
export class PaymentsEscrowCoreRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listTransactions() {
    const rows = await this.prismaService.client.$queryRaw<PaymentTransactionRow[]>(Prisma.sql`
      SELECT
        pt.id,
        pt."dealId",
        pt."transactionType",
        pt.status,
        pt.currency,
        pt."totalAmountMinor",
        pt."heldAmountMinor",
        pt."releasedAmountMinor",
        pt."refundedAmountMinor",
        pt."createdAt",
        pt."updatedAt"
      FROM "PaymentTransaction" pt
      ORDER BY pt."createdAt" DESC
    `);

    return Promise.all(rows.map((row) => this.getTransactionById(row.id)));
  }

  async getTransactionById(id: string) {
    const transactions = await this.prismaService.client.$queryRaw<(PaymentTransactionRow & {
      dealTitle: string | null;
      dealTenantId: string | null;
    })[]>(Prisma.sql`
      SELECT
        pt.id,
        pt."dealId",
        pt."transactionType",
        pt.status,
        pt.currency,
        pt."totalAmountMinor",
        pt."heldAmountMinor",
        pt."releasedAmountMinor",
        pt."refundedAmountMinor",
        pt."createdAt",
        pt."updatedAt",
        wd.title AS "dealTitle",
        wd."tenantId" AS "dealTenantId"
      FROM "PaymentTransaction" pt
      LEFT JOIN "WholesaleDeal" wd ON wd.id = pt."dealId"
      WHERE pt.id = ${id}
    `);

    const transaction = transactions[0];

    if (!transaction) {
      throw new NotFoundException(`Payment transaction ${id} was not found.`);
    }

    const ledgerEntries = await this.prismaService.client.$queryRaw<PaymentLedgerEntryRow[]>(Prisma.sql`
      SELECT
        ple.id,
        ple."paymentTransactionId",
        ple."entryType",
        ple."amountMinor",
        ple."resultingHeldMinor",
        ple."resultingReleasedMinor",
        ple."resultingRefundedMinor",
        ple.note,
        ple."createdAt"
      FROM "PaymentLedgerEntry" ple
      WHERE ple."paymentTransactionId" = ${id}
      ORDER BY ple."createdAt" ASC
    `);

    return {
      ...transaction,
      deal: transaction.dealId
        ? {
            id: transaction.dealId,
            title: transaction.dealTitle,
            tenantId: transaction.dealTenantId
          }
        : null,
      ledgerEntries
    };
  }

  async createTransaction(input: CreatePaymentTransactionInput) {
    const deal = await this.prismaService.client.wholesaleDeal.findUnique({
      where: { id: input.dealId },
      select: { id: true }
    });

    if (!deal) {
      throw new NotFoundException(`Deal ${input.dealId} was not found.`);
    }

    const paymentTransactionId = randomUUID();
    const ledgerEntryId = randomUUID();

    await this.prismaService.client.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "PaymentTransaction" (
          id,
          "dealId",
          "transactionType",
          status,
          currency,
          "totalAmountMinor",
          "heldAmountMinor",
          "releasedAmountMinor",
          "refundedAmountMinor",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${paymentTransactionId},
          ${input.dealId},
          ${'wholesale_deal'}::"PaymentTransactionType",
          ${'created'}::"PaymentTransactionStatus",
          ${input.currency},
          ${input.totalAmountMinor},
          0,
          0,
          0,
          NOW(),
          NOW()
        )
      `);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "PaymentLedgerEntry" (
          id,
          "paymentTransactionId",
          "entryType",
          "amountMinor",
          "resultingHeldMinor",
          "resultingReleasedMinor",
          "resultingRefundedMinor",
          note,
          "createdAt"
        )
          VALUES (
            ${ledgerEntryId},
            ${paymentTransactionId},
            ${'created'}::"PaymentLedgerEntryType",
            ${input.totalAmountMinor},
          0,
          0,
          0,
          ${'transaction created'},
          NOW()
        )
      `);
    });

    return this.getTransactionById(paymentTransactionId);
  }

  async holdFunds(input: UpdateEscrowAmountInput) {
    return this.transitionAmounts(input.paymentTransactionId, 'hold', input.amountMinor, input.note);
  }

  async releaseFunds(input: UpdateEscrowAmountInput) {
    return this.transitionAmounts(input.paymentTransactionId, 'release', input.amountMinor, input.note);
  }

  async refundFunds(input: UpdateEscrowAmountInput) {
    return this.transitionAmounts(input.paymentTransactionId, 'refund', input.amountMinor, input.note);
  }

  private async transitionAmounts(
    paymentTransactionId: string,
    action: 'hold' | 'release' | 'refund',
    requestedAmountMinor?: number,
    note?: string
  ) {
    await this.prismaService.client.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<PaymentTransactionRow[]>(Prisma.sql`
        SELECT
          pt.id,
          pt."dealId",
          pt."transactionType",
          pt.status,
          pt.currency,
          pt."totalAmountMinor",
          pt."heldAmountMinor",
          pt."releasedAmountMinor",
          pt."refundedAmountMinor",
          pt."createdAt",
          pt."updatedAt"
        FROM "PaymentTransaction" pt
        WHERE pt.id = ${paymentTransactionId}
        FOR UPDATE
      `);

      const current = rows[0];

      if (!current) {
        throw new NotFoundException(`Payment transaction ${paymentTransactionId} was not found.`);
      }

      const ledgerEntryId = randomUUID();

      if (action === 'hold') {
        if (current.status !== 'created') {
          throw new ConflictException(`Payment transaction ${paymentTransactionId} cannot be held from ${current.status}.`);
        }

        const holdAmountMinor = requestedAmountMinor ?? current.totalAmountMinor;
        if (holdAmountMinor !== current.totalAmountMinor) {
          throw new ConflictException('MVP hold must cover the full transaction amount.');
        }

        await tx.$executeRaw(Prisma.sql`
          UPDATE "PaymentTransaction"
          SET
            status = ${'held'}::"PaymentTransactionStatus",
            "heldAmountMinor" = ${holdAmountMinor},
            "updatedAt" = NOW()
          WHERE id = ${paymentTransactionId}
        `);

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "PaymentLedgerEntry" (
            id,
            "paymentTransactionId",
            "entryType",
            "amountMinor",
            "resultingHeldMinor",
            "resultingReleasedMinor",
            "resultingRefundedMinor",
            note,
            "createdAt"
          )
          VALUES (
            ${ledgerEntryId},
            ${paymentTransactionId},
            ${'hold'}::"PaymentLedgerEntryType",
            ${holdAmountMinor},
            ${holdAmountMinor},
            ${current.releasedAmountMinor},
            ${current.refundedAmountMinor},
            ${note ?? 'funds placed on hold'},
            NOW()
          )
        `);
      }

      if (action === 'release') {
        if (!['held', 'partially_released'].includes(current.status)) {
          throw new ConflictException(`Payment transaction ${paymentTransactionId} cannot be released from ${current.status}.`);
        }

        const remainingHeldMinor = current.heldAmountMinor;
        const releaseAmountMinor = requestedAmountMinor ?? remainingHeldMinor;

        if (releaseAmountMinor <= 0 || releaseAmountMinor > remainingHeldMinor) {
          throw new ConflictException('Release amount must be positive and within held funds.');
        }

        const nextHeldMinor = remainingHeldMinor - releaseAmountMinor;
        const nextReleasedMinor = current.releasedAmountMinor + releaseAmountMinor;
        const nextStatus = nextHeldMinor === 0 ? 'released' : 'partially_released';

        await tx.$executeRaw(Prisma.sql`
          UPDATE "PaymentTransaction"
          SET
            status = ${nextStatus}::"PaymentTransactionStatus",
            "heldAmountMinor" = ${nextHeldMinor},
            "releasedAmountMinor" = ${nextReleasedMinor},
            "updatedAt" = NOW()
          WHERE id = ${paymentTransactionId}
        `);

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "PaymentLedgerEntry" (
            id,
            "paymentTransactionId",
            "entryType",
            "amountMinor",
            "resultingHeldMinor",
            "resultingReleasedMinor",
            "resultingRefundedMinor",
            note,
            "createdAt"
          )
          VALUES (
            ${ledgerEntryId},
            ${paymentTransactionId},
            ${'release'}::"PaymentLedgerEntryType",
            ${releaseAmountMinor},
            ${nextHeldMinor},
            ${nextReleasedMinor},
            ${current.refundedAmountMinor},
            ${note ?? 'funds released'},
            NOW()
          )
        `);
      }

      if (action === 'refund') {
        if (!['held', 'partially_released', 'released', 'disputed'].includes(current.status)) {
          throw new ConflictException(`Payment transaction ${paymentTransactionId} cannot be refunded from ${current.status}.`);
        }

        const refundableHeldMinor = current.heldAmountMinor;
        const refundAmountMinor = requestedAmountMinor ?? refundableHeldMinor;

        if (refundAmountMinor <= 0 || refundAmountMinor > refundableHeldMinor) {
          throw new ConflictException('Refund amount must be positive and within held funds.');
        }

        const nextHeldMinor = refundableHeldMinor - refundAmountMinor;
        const nextRefundedMinor = current.refundedAmountMinor + refundAmountMinor;
        const nextStatus =
          nextHeldMinor === 0 && current.releasedAmountMinor === 0 ? 'refunded' : 'partially_released';

        await tx.$executeRaw(Prisma.sql`
          UPDATE "PaymentTransaction"
          SET
            status = ${nextStatus}::"PaymentTransactionStatus",
            "heldAmountMinor" = ${nextHeldMinor},
            "refundedAmountMinor" = ${nextRefundedMinor},
            "updatedAt" = NOW()
          WHERE id = ${paymentTransactionId}
        `);

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "PaymentLedgerEntry" (
            id,
            "paymentTransactionId",
            "entryType",
            "amountMinor",
            "resultingHeldMinor",
            "resultingReleasedMinor",
            "resultingRefundedMinor",
            note,
            "createdAt"
          )
          VALUES (
            ${ledgerEntryId},
            ${paymentTransactionId},
            ${'refund'}::"PaymentLedgerEntryType",
            ${refundAmountMinor},
            ${nextHeldMinor},
            ${current.releasedAmountMinor},
            ${nextRefundedMinor},
            ${note ?? 'funds refunded'},
            NOW()
          )
        `);
      }
    });

    return this.getTransactionById(paymentTransactionId);
  }
}
