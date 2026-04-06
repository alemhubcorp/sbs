import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@prisma/client';
import { PrismaService } from '../../app/prisma.service.js';

export interface CreateWholesaleRfqInput {
  tenantId: string;
  buyerProfileId?: string | undefined;
  requestedByUserId?: string | undefined;
  title: string;
  description?: string | undefined;
  currency: string;
}

export interface CreateWholesaleQuoteInput {
  rfqId: string;
  sellerProfileId: string;
  amountMinor: number;
  currency: string;
  message?: string | undefined;
}

export interface AcceptWholesaleQuoteInput {
  quoteId: string;
  contractId?: string | undefined;
  documentLinkage?: Prisma.InputJsonValue | undefined;
}

@Injectable()
export class WholesaleCoreRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  listRfqs() {
    return this.prismaService.client.wholesaleRfq.findMany({
      include: this.rfqInclude,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async createRfq(input: CreateWholesaleRfqInput) {
    await this.ensureRfqRelations(input.tenantId, input.buyerProfileId, input.requestedByUserId);

    return this.prismaService.client.wholesaleRfq.create({
      data: {
        tenantId: input.tenantId,
        ...(input.buyerProfileId ? { buyerProfileId: input.buyerProfileId } : {}),
        ...(input.requestedByUserId ? { requestedByUserId: input.requestedByUserId } : {}),
        title: input.title,
        ...(input.description ? { description: input.description } : {}),
        currency: input.currency
      },
      include: this.rfqInclude
    });
  }

  listQuotesForRfq(rfqId: string) {
    return this.prismaService.client.wholesaleQuote.findMany({
      where: { rfqId },
      include: this.quoteInclude,
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  async getQuoteById(id: string) {
    const quote = await this.prismaService.client.wholesaleQuote.findUnique({
      where: { id },
      include: this.quoteInclude
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${id} was not found.`);
    }

    return quote;
  }

  async submitQuote(input: CreateWholesaleQuoteInput) {
    await this.ensureQuoteRelations(input.rfqId, input.sellerProfileId);

    try {
      const quote = await this.prismaService.client.wholesaleQuote.create({
        data: {
          rfqId: input.rfqId,
          sellerProfileId: input.sellerProfileId,
          amountMinor: input.amountMinor,
          currency: input.currency,
          ...(input.message ? { message: input.message } : {})
        },
        include: this.quoteInclude
      });

      await this.prismaService.client.wholesaleRfq.update({
        where: { id: input.rfqId },
        data: {
          status: 'quoted'
        }
      });

      return quote;
    } catch (error) {
      this.handleConflict(error, 'Quote could not be created.');
    }
  }

  listDeals() {
    return this.prismaService.client.wholesaleDeal.findMany({
      include: this.dealInclude,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getDealById(id: string) {
    const deal = await this.prismaService.client.wholesaleDeal.findUnique({
      where: { id },
      include: this.dealInclude
    });

    if (!deal) {
      throw new NotFoundException(`Deal ${id} was not found.`);
    }

    return deal;
  }

  async getDealRoomByDealId(dealId: string) {
    const dealRoom = await this.prismaService.client.dealRoom.findUnique({
      where: { dealId },
      include: {
        deal: {
          include: this.dealInclude
        }
      }
    });

    if (!dealRoom) {
      throw new NotFoundException(`Deal room for deal ${dealId} was not found.`);
    }

    return dealRoom;
  }

  async acceptQuote(input: AcceptWholesaleQuoteInput) {
    return this.prismaService.client.$transaction(async (tx) => {
      const quote = await tx.wholesaleQuote.findUnique({
        where: { id: input.quoteId },
        include: {
          rfq: true,
          sellerProfile: true
        }
      });

      if (!quote) {
        throw new NotFoundException(`Quote ${input.quoteId} was not found.`);
      }

      if (quote.status === 'accepted') {
        const existingDeal = await tx.wholesaleDeal.findUnique({
          where: { acceptedQuoteId: quote.id },
          include: this.dealInclude
        });

        if (!existingDeal) {
          throw new ConflictException(`Quote ${input.quoteId} is already accepted.`);
        }

        return existingDeal;
      }

      if (quote.rfq.status === 'closed') {
        throw new ConflictException(`RFQ ${quote.rfqId} is already closed.`);
      }

      const deal = await this.createAcceptedDeal(tx, quote.id, input.contractId, input.documentLinkage);
      return deal;
    });
  }

  private async createAcceptedDeal(
    tx: Prisma.TransactionClient,
    quoteId: string,
    contractId?: string,
    documentLinkage?: Prisma.InputJsonValue
  ) {
    const quote = await tx.wholesaleQuote.findUnique({
      where: { id: quoteId },
      include: {
        rfq: true,
        sellerProfile: true
      }
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${quoteId} was not found.`);
    }

    await tx.wholesaleQuote.updateMany({
      where: {
        rfqId: quote.rfqId,
        status: 'submitted'
      },
      data: {
        status: 'rejected'
      }
    });

    await tx.wholesaleQuote.update({
      where: { id: quote.id },
      data: {
        status: 'accepted'
      }
    });

    await tx.wholesaleRfq.update({
      where: { id: quote.rfqId },
      data: {
        status: 'closed',
        selectedQuoteId: quote.id,
        ...(contractId ? { contractId } : {}),
        ...(documentLinkage ? { documentLinkage } : {})
      }
    });

    const deal = await tx.wholesaleDeal.create({
      data: {
        rfqId: quote.rfq.id,
        acceptedQuoteId: quote.id,
        tenantId: quote.rfq.tenantId,
        ...(quote.rfq.buyerProfileId ? { buyerProfileId: quote.rfq.buyerProfileId } : {}),
        sellerProfileId: quote.sellerProfileId,
        title: quote.rfq.title,
        status: 'in_room',
        ...(contractId ? { contractId } : {}),
        ...(documentLinkage ? { documentLinkage } : {}),
        dealRoom: {
          create: {
            status: 'active',
            latestMessage: 'Deal room created from accepted quote.'
          }
        }
      },
      include: this.dealInclude
    });

    return deal;
  }

  private async ensureRfqRelations(tenantId: string, buyerProfileId?: string, requestedByUserId?: string) {
    const prisma = this.prismaService.client;

    const [tenant, buyerProfile, user] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } }),
      buyerProfileId
        ? prisma.buyerProfile.findUnique({ where: { id: buyerProfileId }, select: { id: true, tenantId: true } })
        : Promise.resolve(null),
      requestedByUserId
        ? prisma.user.findUnique({ where: { id: requestedByUserId }, select: { id: true } })
        : Promise.resolve(null)
    ]);

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} was not found.`);
    }

    if (buyerProfileId && !buyerProfile) {
      throw new NotFoundException(`Buyer profile ${buyerProfileId} was not found.`);
    }

    if (buyerProfile && buyerProfile.tenantId && buyerProfile.tenantId !== tenantId) {
      throw new ConflictException('Buyer profile tenant does not match RFQ tenant.');
    }

    if (requestedByUserId && !user) {
      throw new NotFoundException(`User ${requestedByUserId} was not found.`);
    }
  }

  private async ensureQuoteRelations(rfqId: string, sellerProfileId: string) {
    const [rfq, sellerProfile] = await Promise.all([
      this.prismaService.client.wholesaleRfq.findUnique({
        where: { id: rfqId },
        select: { id: true, status: true }
      }),
      this.prismaService.client.sellerProfile.findUnique({
        where: { id: sellerProfileId },
        select: { id: true }
      })
    ]);

    if (!rfq) {
      throw new NotFoundException(`RFQ ${rfqId} was not found.`);
    }

    if (rfq.status === 'closed') {
      throw new ConflictException(`RFQ ${rfqId} is closed.`);
    }

    if (!sellerProfile) {
      throw new NotFoundException(`Seller profile ${sellerProfileId} was not found.`);
    }
  }

  private handleConflict(error: unknown, fallbackMessage: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A unique constraint would be violated by this request.');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new ConflictException(fallbackMessage);
  }

  private readonly rfqInclude = {
    tenant: true,
    buyerProfile: true,
    requestedByUser: true,
    selectedQuote: {
      include: {
        sellerProfile: true
      }
    },
    quotes: {
      include: {
        sellerProfile: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    }
  } satisfies Prisma.WholesaleRfqInclude;

  private readonly quoteInclude = {
    rfq: {
      include: {
        tenant: true,
        buyerProfile: true
      }
    },
    sellerProfile: true
  } satisfies Prisma.WholesaleQuoteInclude;

  private readonly dealInclude = {
    rfq: {
      include: {
        tenant: true,
        buyerProfile: true,
        quotes: {
          include: {
            sellerProfile: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    },
    acceptedQuote: {
      include: {
        sellerProfile: true
      }
    },
    tenant: true,
    buyerProfile: true,
    sellerProfile: true,
    dealRoom: true,
    contract: {
      include: {
        versions: {
          orderBy: {
            versionNumber: 'desc'
          }
        }
      }
    },
    documentLinks: {
      include: {
        document: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }
  } satisfies Prisma.WholesaleDealInclude;
}
