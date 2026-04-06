import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
}
