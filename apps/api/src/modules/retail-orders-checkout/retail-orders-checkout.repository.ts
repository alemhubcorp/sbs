import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../app/prisma.service.js';

export interface CreateRetailOrderInput {
  buyerProfileId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface UpdateRetailOrderStatusInput {
  status: 'paid' | 'fulfilled' | 'cancelled';
}

const allowedTransitions: Record<string, string[]> = {
  created: ['paid', 'cancelled'],
  paid: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: []
};

@Injectable()
export class RetailOrdersCheckoutRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listOrders() {
    return this.prismaService.client.retailOrder.findMany({
      include: {
        buyerProfile: true,
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getOrderById(id: string) {
    const order = await this.prismaService.client.retailOrder.findUnique({
      where: { id },
      include: {
        buyerProfile: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundException(`Retail order ${id} was not found.`);
    }

    return order;
  }

  async createOrder(input: CreateRetailOrderInput) {
    if (!input.items.length) {
      throw new BadRequestException('Retail orders require at least one item.');
    }

    const buyerProfile = await this.prismaService.client.buyerProfile.findUnique({
      where: { id: input.buyerProfileId },
      select: { id: true }
    });

    if (!buyerProfile) {
      throw new NotFoundException(`Buyer profile ${input.buyerProfileId} was not found.`);
    }

    const productIds = input.items.map((item) => item.productId);
    const products = await this.prismaService.client.product.findMany({
      where: {
        id: {
          in: productIds
        },
        status: 'published'
      },
      include: {
        prices: {
          where: {
            isActive: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (products.length !== new Set(productIds).size) {
      throw new NotFoundException('One or more products were not found or are not published.');
    }

    const pricedItems = input.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      const activePrice = product?.prices[0];

      if (!product || !activePrice) {
        throw new BadRequestException(`Product ${item.productId} does not have an active price.`);
      }

      return {
        product,
        quantity: item.quantity,
        unitAmountMinor: activePrice.amountMinor,
        lineAmountMinor: activePrice.amountMinor * item.quantity,
        currency: activePrice.currency
      };
    });

    const [currency] = [...new Set(pricedItems.map((item) => item.currency))];

    if (!currency || new Set(pricedItems.map((item) => item.currency)).size !== 1) {
      throw new BadRequestException('Retail order items must share a single currency.');
    }

    const totalAmountMinor = pricedItems.reduce((total, item) => total + item.lineAmountMinor, 0);

    return this.prismaService.client.retailOrder.create({
      data: {
        buyerProfileId: input.buyerProfileId,
        status: 'created',
        currency,
        totalAmountMinor,
        items: {
          create: pricedItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitAmountMinor: item.unitAmountMinor,
            lineAmountMinor: item.lineAmountMinor,
            currency: item.currency,
            productName: item.product.name,
            productSlug: item.product.slug
          }))
        }
      },
      include: {
        buyerProfile: true,
        items: true
      }
    });
  }

  async updateOrderStatus(id: string, input: UpdateRetailOrderStatusInput) {
    const existing = await this.getOrderById(id);
    const nextStatus = input.status;

    const allowedNextStatuses = allowedTransitions[existing.status] ?? [];

    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new BadRequestException(`Retail order cannot transition from ${existing.status} to ${nextStatus}.`);
    }

    return this.prismaService.client.retailOrder.update({
      where: { id },
      data: {
        status: nextStatus
      },
      include: {
        buyerProfile: true,
        items: true
      }
    });
  }
}
