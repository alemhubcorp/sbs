import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ContractDealStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../app/prisma.service.js';

export interface CreateContractInput {
  dealId: string;
  contractType: 'master_purchase' | 'supply_agreement' | 'annex' | 'custom';
  title: string;
  metadata?: Prisma.InputJsonValue | undefined;
}

export interface CreateContractVersionInput {
  contractId: string;
  label?: string | undefined;
  storageBucket?: string | undefined;
  storageKey?: string | undefined;
  createdByUserId?: string | undefined;
}

export interface CreateContractRfqInput {
  productId: string;
  qty: number;
  buyerUserId: string;
}

export interface UpdateContractRfqStatusInput {
  id: string;
  status: 'new' | 'quoted' | 'accepted' | 'rejected';
}

export interface CreateContractRfqQuoteInput {
  rfqId: string;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  note?: string | undefined;
  supplierUserId: string;
}

export interface UpdateContractRfqQuoteStatusInput {
  id: string;
  status: 'submitted' | 'accepted' | 'rejected';
}

type ContractDealAction = 'fund' | 'ship' | 'confirm' | 'dispute';

@Injectable()
export class ContractCoreRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  listContracts() {
    return this.prismaService.client.contract.findMany({
      include: this.contractInclude,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getContractById(id: string) {
    const contract = await this.prismaService.client.contract.findUnique({
      where: { id },
      include: this.contractInclude
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} was not found.`);
    }

    return contract;
  }

  async createContract(input: CreateContractInput) {
    const deal = await this.prismaService.client.wholesaleDeal.findUnique({
      where: { id: input.dealId },
      select: { id: true, contractId: true }
    });

    if (!deal) {
      throw new NotFoundException(`Deal ${input.dealId} was not found.`);
    }

    if (deal.contractId) {
      const existingContract = await this.prismaService.client.contract.findUnique({
        where: { id: deal.contractId },
        select: { id: true }
      });

      if (existingContract) {
        throw new ConflictException(`Deal ${input.dealId} already has a linked contract.`);
      }
    }

    try {
      return await this.prismaService.client.$transaction(async (tx) => {
        const contract = await tx.contract.create({
          data: {
            ...(deal.contractId ? { id: deal.contractId } : {}),
            dealId: input.dealId,
            contractType: input.contractType,
            title: input.title,
            ...(input.metadata ? { metadata: input.metadata } : {})
          },
          include: this.contractInclude
        });

        await tx.wholesaleDeal.update({
          where: { id: input.dealId },
          data: {
            contractId: contract.id,
            status: 'contract_pending'
          }
        });

        return contract;
      });
    } catch (error) {
      this.handleConflict(error, 'Contract could not be created.');
    }
  }

  async createContractVersion(input: CreateContractVersionInput) {
    const contract = await this.prismaService.client.contract.findUnique({
      where: { id: input.contractId },
      include: {
        versions: {
          orderBy: {
            versionNumber: 'desc'
          },
          take: 1
        }
      }
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${input.contractId} was not found.`);
    }

    if (input.createdByUserId) {
      const user = await this.prismaService.client.user.findUnique({
        where: { id: input.createdByUserId },
        select: { id: true }
      });

      if (!user) {
        throw new NotFoundException(`User ${input.createdByUserId} was not found.`);
      }
    }

    const nextVersionNumber = (contract.versions[0]?.versionNumber ?? 0) + 1;

    return this.prismaService.client.contractVersion.create({
      data: {
        contractId: input.contractId,
        versionNumber: nextVersionNumber,
        ...(input.label ? { label: input.label } : {}),
        ...(input.storageBucket ? { storageBucket: input.storageBucket } : {}),
        ...(input.storageKey ? { storageKey: input.storageKey } : {}),
        ...(input.createdByUserId ? { createdByUserId: input.createdByUserId } : {})
      },
      include: {
        contract: true,
        createdByUser: true
      }
    });
  }

  async updateContractStatus(id: string, status: 'draft' | 'active' | 'archived') {
    await this.getContractById(id);

    return this.prismaService.client.contract.update({
      where: { id },
      data: { status },
      include: this.contractInclude
    });
  }

  createContractRfq(input: CreateContractRfqInput) {
    return this.prismaService.client.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: input.productId },
        select: {
          id: true,
          sellerProfile: {
            select: {
              userId: true
            }
          }
        }
      });

      if (!product) {
        throw new NotFoundException(`Product ${input.productId} was not found.`);
      }

      if (!product.sellerProfile.userId) {
        throw new ConflictException(`Product ${input.productId} is not linked to a supplier user.`);
      }

      return tx.contractRfq.create({
        data: {
          productId: input.productId,
          qty: input.qty,
          buyerUserId: input.buyerUserId,
          supplierUserId: product.sellerProfile.userId
        },
        include: this.contractRfqInclude
      });
    });
  }

  listContractRfqsForUser(userId: string) {
    return this.prismaService.client.contractRfq.findMany({
      where: {
        OR: [{ buyerUserId: userId }, { supplierUserId: userId }]
      },
      include: this.contractRfqInclude,
      orderBy: [
        {
          createdAt: 'desc'
        },
        {
          id: 'desc'
        }
      ]
    });
  }

  async updateContractRfqStatus(input: UpdateContractRfqStatusInput) {
    await this.getContractRfqById(input.id);

    return this.prismaService.client.contractRfq.update({
      where: { id: input.id },
      data: {
        status: input.status
      },
      include: this.contractRfqInclude
    });
  }

  async getContractRfqById(id: string) {
    const rfq = await this.prismaService.client.contractRfq.findUnique({
      where: { id },
      include: this.contractRfqInclude
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ ${id} was not found.`);
    }

    return rfq;
  }

  async getContractRfqByIdForUser(id: string, userId: string) {
    const rfq = await this.prismaService.client.contractRfq.findFirst({
      where: {
        id,
        OR: [{ buyerUserId: userId }, { supplierUserId: userId }]
      },
      include: this.contractRfqInclude
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ ${id} was not found.`);
    }

    return rfq;
  }

  async createContractRfqQuote(input: CreateContractRfqQuoteInput) {
    const rfq = await this.getContractRfqById(input.rfqId);

    try {
      return await this.prismaService.client.$transaction(async (tx) => {
        const quote = await tx.contractRfqQuote.create({
          data: {
            rfqId: input.rfqId,
            buyerUserId: rfq.buyerUserId,
            supplierUserId: input.supplierUserId,
            unitPrice: input.unitPrice,
            totalPrice: input.totalPrice,
            currency: input.currency,
            ...(input.note ? { note: input.note } : {})
          }
        });

        await tx.contractRfq.update({
          where: { id: input.rfqId },
          data: {
            status: 'quoted'
          }
        });

        return tx.contractRfqQuote.findUniqueOrThrow({
          where: { id: quote.id },
          include: this.contractRfqQuoteInclude
        });
      });
    } catch (error) {
      this.handleConflict(error, 'Quote could not be created.');
    }
  }

  listContractRfqQuotesForUser(userId: string) {
    return this.prismaService.client.contractRfqQuote.findMany({
      where: {
        OR: [{ buyerUserId: userId }, { supplierUserId: userId }]
      },
      include: this.contractRfqQuoteInclude,
      orderBy: [
        {
          createdAt: 'desc'
        },
        {
          id: 'desc'
        }
      ]
    });
  }

  async getContractRfqQuoteById(id: string) {
    const quote = await this.prismaService.client.contractRfqQuote.findUnique({
      where: { id },
      include: this.contractRfqQuoteInclude
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${id} was not found.`);
    }

    return quote;
  }

  async getContractRfqQuoteByIdForUser(id: string, userId: string) {
    const quote = await this.prismaService.client.contractRfqQuote.findFirst({
      where: {
        id,
        OR: [{ buyerUserId: userId }, { supplierUserId: userId }]
      },
      include: this.contractRfqQuoteInclude
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${id} was not found.`);
    }

    return quote;
  }

  async getContractRfqDealById(id: string) {
    const deal = await this.prismaService.client.contractRfqDeal.findUnique({
      where: { id },
      include: this.contractRfqDealInclude
    });

    if (!deal) {
      throw new NotFoundException(`Deal ${id} was not found.`);
    }

    return deal;
  }

  async getContractRfqDealByIdForUser(id: string, userId: string) {
    const deal = await this.prismaService.client.contractRfqDeal.findFirst({
      where: {
        id,
        OR: [{ buyerUserId: userId }, { supplierUserId: userId }]
      },
      include: this.contractRfqDealInclude
    });

    if (!deal) {
      throw new NotFoundException(`Deal ${id} was not found.`);
    }

    return deal;
  }

  async updateContractRfqQuoteStatus(input: UpdateContractRfqQuoteStatusInput) {
    await this.getContractRfqQuoteById(input.id);

    return this.prismaService.client.contractRfqQuote.update({
      where: { id: input.id },
      data: {
        status: input.status
      },
      include: this.contractRfqQuoteInclude
    });
  }

  async createContractRfqDealForAcceptedQuote(quoteId: string) {
    const quote = await this.getContractRfqQuoteById(quoteId);

    try {
      return await this.prismaService.client.$transaction(async (tx) => {
        const agreementSnapshot = this.buildAgreementSnapshot(quote);
        const updatedQuote = await tx.contractRfqQuote.update({
          where: { id: quoteId },
          data: {
            status: 'accepted'
          }
        });

        await tx.contractRfq.update({
          where: { id: quote.rfqId },
          data: {
            status: 'accepted'
          }
        });

        const deal = await tx.contractRfqDeal.upsert({
          where: { quoteId },
          update: {
            buyerUserId: quote.buyerUserId,
            supplierUserId: quote.supplierUserId,
            buyerStatus: 'accepted',
            supplierStatus: 'pending',
            dealStatus: 'accepted',
            agreementSnapshot
          },
          create: {
            rfqId: quote.rfqId,
            quoteId: updatedQuote.id,
            buyerUserId: quote.buyerUserId,
            supplierUserId: quote.supplierUserId,
            buyerStatus: 'accepted',
            supplierStatus: 'pending',
            dealStatus: 'accepted',
            agreementSnapshot
          },
          include: this.contractRfqDealInclude
        });

        return deal;
      });
    } catch (error) {
      this.handleConflict(error, 'Deal could not be created.');
    }
  }

  async rejectContractRfqQuote(quoteId: string) {
    const quote = await this.getContractRfqQuoteById(quoteId);

    return this.prismaService.client.$transaction(async (tx) => {
      const updatedQuote = await tx.contractRfqQuote.update({
        where: { id: quoteId },
        data: {
          status: 'rejected'
        },
        include: this.contractRfqQuoteInclude
      });

      await tx.contractRfq.update({
        where: { id: quote.rfqId },
        data: {
          status: 'rejected'
        }
      });

      return updatedQuote;
    });
  }

  listContractRfqDealsForUser(userId: string) {
    return this.prismaService.client.contractRfqDeal.findMany({
      where: {
        OR: [{ buyerUserId: userId }, { supplierUserId: userId }]
      },
      include: this.contractRfqDealInclude,
      orderBy: [
        {
          createdAt: 'desc'
        },
        {
          id: 'desc'
        }
      ]
    });
  }

  async progressContractRfqDeal(id: string, action: ContractDealAction) {
    const deal = await this.getContractRfqDealById(id);

    return this.prismaService.client.contractRfqDeal.update({
      where: { id },
      data: this.resolveNextDealState(deal.dealStatus, action),
      include: this.contractRfqDealInclude
    });
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

  private readonly contractInclude = {
    deal: {
      include: {
        rfq: true,
        dealRoom: true
      }
    },
    versions: {
      include: {
        createdByUser: true
      },
      orderBy: {
        versionNumber: 'desc'
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
  } satisfies Prisma.ContractInclude;

  private readonly contractRfqQuoteInclude = {
    rfq: {
      include: {
        quotes: true,
        deal: true
      }
    },
    deal: true
  } satisfies Prisma.ContractRfqQuoteInclude;

  private readonly contractRfqDealInclude = {
    rfq: {
      select: {
        id: true,
        productId: true,
        qty: true,
        buyerUserId: true,
        supplierUserId: true,
        status: true,
        createdAt: true
      }
    },
    quote: {
      select: {
        id: true,
        rfqId: true,
        buyerUserId: true,
        supplierUserId: true,
        unitPrice: true,
        totalPrice: true,
        currency: true,
        note: true,
        status: true,
        createdAt: true
      }
    },
    paymentRecords: {
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        attempts: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    }
  } satisfies Prisma.ContractRfqDealInclude;

  private readonly contractRfqInclude = {
    quotes: {
      orderBy: {
        createdAt: 'desc'
      }
    },
    deal: true
  } satisfies Prisma.ContractRfqInclude;

  private buildAgreementSnapshot(quote: any) {
    return {
      kind: 'contract_rfq_deal',
      invoiceNumber: `INV-${quote.id.slice(0, 8).toUpperCase()}`,
      quoteId: quote.id,
      rfqId: quote.rfqId,
      priceMinor: quote.totalPrice,
      qty: quote.rfq.qty,
      currency: quote.currency,
      parties: {
        buyerUserId: quote.buyerUserId,
        supplierUserId: quote.supplierUserId
      },
      timestamps: {
        quoteCreatedAt: quote.createdAt.toISOString(),
        acceptedAt: new Date().toISOString()
      },
      note: quote.note ?? null
    };
  }

  private resolveNextDealState(
    currentStatus: ContractDealStatus,
    action: ContractDealAction
  ): Prisma.ContractRfqDealUpdateInput {
    if (action === 'fund') {
      if (currentStatus !== 'accepted') {
        throw new ConflictException(`Deal can only be funded from accepted status; current status is ${currentStatus}.`);
      }

      return {
        dealStatus: 'in_escrow',
        buyerStatus: 'active',
        supplierStatus: 'pending'
      };
    }

    if (action === 'ship') {
      if (currentStatus !== 'in_escrow') {
        throw new ConflictException(`Deal can only be marked as shipped from in_escrow; current status is ${currentStatus}.`);
      }

      return {
        dealStatus: 'shipped',
        buyerStatus: 'active',
        supplierStatus: 'active'
      };
    }

    if (action === 'confirm') {
      if (currentStatus !== 'shipped') {
        throw new ConflictException(`Deal can only be confirmed from shipped; current status is ${currentStatus}.`);
      }

      return {
        dealStatus: 'completed',
        buyerStatus: 'completed',
        supplierStatus: 'completed'
      };
    }

    if (currentStatus === 'completed') {
      throw new ConflictException('Completed deals cannot be disputed.');
    }

    if (currentStatus === 'disputed') {
      throw new ConflictException('Deal is already disputed.');
    }

    return {
      dealStatus: 'disputed',
      buyerStatus: 'disputed',
      supplierStatus: 'disputed'
    };
  }
}
