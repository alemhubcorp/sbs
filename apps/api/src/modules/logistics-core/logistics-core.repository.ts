import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../app/prisma.service.js';

export interface CreateLogisticsProviderInput {
  name: string;
  contactEmail?: string | undefined;
}

export interface UpsertCapabilityProfileInput {
  providerId: string;
  transportTypes?: Prisma.InputJsonValue | undefined;
  serviceTypes?: Prisma.InputJsonValue | undefined;
  cargoCategories?: Prisma.InputJsonValue | undefined;
  supportedRegions?: Prisma.InputJsonValue | undefined;
  deliveryModes?: Prisma.InputJsonValue | undefined;
  additionalServices?: Prisma.InputJsonValue | undefined;
}

export interface SelectLogisticsProviderInput {
  dealId: string;
  logisticsProviderId: string;
  notes?: string | undefined;
}

@Injectable()
export class LogisticsCoreRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  listProviders() {
    return this.prismaService.client.logisticsProvider.findMany({
      include: {
        capabilityProfile: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getProviderById(id: string) {
    const provider = await this.prismaService.client.logisticsProvider.findUnique({
      where: { id },
      include: {
        capabilityProfile: true
      }
    });

    if (!provider) {
      throw new NotFoundException(`Logistics provider ${id} was not found.`);
    }

    return provider;
  }

  createProvider(input: CreateLogisticsProviderInput) {
    return this.prismaService.client.logisticsProvider.create({
      data: {
        name: input.name,
        ...(input.contactEmail ? { contactEmail: input.contactEmail } : {})
      },
      include: {
        capabilityProfile: true
      }
    });
  }

  async updateProviderStatus(id: string, status: 'draft' | 'active' | 'suspended') {
    await this.getProviderById(id);

    return this.prismaService.client.logisticsProvider.update({
      where: { id },
      data: { status },
      include: {
        capabilityProfile: true
      }
    });
  }

  async upsertCapabilityProfile(input: UpsertCapabilityProfileInput) {
    await this.getProviderById(input.providerId);

    return this.prismaService.client.logisticsCapabilityProfile.upsert({
      where: {
        providerId: input.providerId
      },
      create: {
        providerId: input.providerId,
        ...(input.transportTypes ? { transportTypes: input.transportTypes } : {}),
        ...(input.serviceTypes ? { serviceTypes: input.serviceTypes } : {}),
        ...(input.cargoCategories ? { cargoCategories: input.cargoCategories } : {}),
        ...(input.supportedRegions ? { supportedRegions: input.supportedRegions } : {}),
        ...(input.deliveryModes ? { deliveryModes: input.deliveryModes } : {}),
        ...(input.additionalServices ? { additionalServices: input.additionalServices } : {})
      },
      update: {
        ...(input.transportTypes ? { transportTypes: input.transportTypes } : {}),
        ...(input.serviceTypes ? { serviceTypes: input.serviceTypes } : {}),
        ...(input.cargoCategories ? { cargoCategories: input.cargoCategories } : {}),
        ...(input.supportedRegions ? { supportedRegions: input.supportedRegions } : {}),
        ...(input.deliveryModes ? { deliveryModes: input.deliveryModes } : {}),
        ...(input.additionalServices ? { additionalServices: input.additionalServices } : {})
      },
      include: {
        provider: true
      }
    });
  }

  async selectProviderForDeal(input: SelectLogisticsProviderInput) {
    const [deal, provider] = await Promise.all([
      this.prismaService.client.wholesaleDeal.findUnique({ where: { id: input.dealId }, select: { id: true } }),
      this.prismaService.client.logisticsProvider.findUnique({
        where: { id: input.logisticsProviderId },
        select: { id: true, status: true }
      })
    ]);

    if (!deal) {
      throw new NotFoundException(`Deal ${input.dealId} was not found.`);
    }

    if (!provider) {
      throw new NotFoundException(`Logistics provider ${input.logisticsProviderId} was not found.`);
    }

    return this.prismaService.client.dealLogisticsSelection.upsert({
      where: {
        dealId: input.dealId
      },
      create: {
        dealId: input.dealId,
        logisticsProviderId: input.logisticsProviderId,
        status: 'selected',
        ...(input.notes ? { notes: input.notes } : {})
      },
      update: {
        logisticsProviderId: input.logisticsProviderId,
        status: 'changed',
        ...(input.notes ? { notes: input.notes } : {})
      },
      include: {
        deal: true,
        logisticsProvider: {
          include: {
            capabilityProfile: true
          }
        }
      }
    });
  }

  async getDealForSelection(dealId: string) {
    const deal = await this.prismaService.client.wholesaleDeal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        tenantId: true
      }
    });

    if (!deal) {
      throw new NotFoundException(`Deal ${dealId} was not found.`);
    }

    return deal;
  }

  async getDealSelection(dealId: string) {
    const selection = await this.prismaService.client.dealLogisticsSelection.findUnique({
      where: { dealId },
      include: {
        deal: true,
        logisticsProvider: {
          include: {
            capabilityProfile: true
          }
        }
      }
    });

    if (!selection) {
      throw new NotFoundException(`No logistics provider selected for deal ${dealId}.`);
    }

    return selection;
  }
}
