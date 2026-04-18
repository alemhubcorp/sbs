import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../app/prisma.service.js';
import type { AuthContext } from '../../app/auth-context.js';

type RetailOrderStatus = 'created' | 'pending' | 'paid' | 'shipped' | 'delivered' | 'fulfilled' | 'cancelled';
type RetailPaymentStatus = 'pending' | 'paid' | 'failed';

export interface CreateRetailOrderInput {
  buyerProfileId?: string | undefined;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface UpdateRetailOrderStatusInput {
  status: RetailOrderStatus;
}

export interface CartAddressInput {
  name: string;
  line1: string;
  line2?: string | undefined;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  phone?: string | undefined;
}

export interface UpdateCartItemInput {
  quantity: number;
}

export interface SubmitPaymentInput {
  simulateFailure?: boolean | undefined;
  note?: string | undefined;
}

const retailOrderInclude = {
  buyerProfile: {
    include: {
      user: true,
      tenant: true
    }
  },
  supplierProfile: {
    include: {
      user: true,
      tenant: true
    }
  },
  paymentRecords: {
    orderBy: {
      createdAt: 'desc' as const
    },
    include: {
      attempts: {
        orderBy: {
          createdAt: 'asc' as const
        }
      }
    }
  },
  items: {
    include: {
      product: {
        include: {
          category: true,
          sellerProfile: true,
          prices: {
            where: {
              isActive: true
            },
            orderBy: {
              createdAt: 'desc' as const
            },
            take: 1
          }
        }
      }
    },
    orderBy: {
      createdAt: 'asc' as const
    }
  }
};

type RetailOrderRecord = Prisma.RetailOrderGetPayload<{
  include: typeof retailOrderInclude;
}>;

type RetailOrderIdentity = Pick<RetailOrderRecord, 'id' | 'buyerProfileId' | 'supplierProfileId'>;

@Injectable()
export class RetailOrdersCheckoutRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listOrders(authContext: AuthContext) {
    const where = await this.buildAccessWhere(authContext);
    return this.prismaService.client.retailOrder.findMany({
      ...(where ? { where } : {}),
      include: retailOrderInclude,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getOrderById(id: string, authContext?: AuthContext) {
    const order = await this.prismaService.client.retailOrder.findUnique({
      where: { id },
      include: retailOrderInclude
    });

    if (!order) {
      throw new NotFoundException(`Retail order ${id} was not found.`);
    }

    if (authContext) {
      await this.assertOrderAccess(authContext, order);
    }

    return order;
  }

  async getCart(authContext: AuthContext) {
    const buyerProfileIds = await this.getBuyerProfileIds(authContext);

    if (!buyerProfileIds.length) {
      return null;
    }

    return this.prismaService.client.retailOrder.findFirst({
      where: {
        buyerProfileId: {
          in: buyerProfileIds
        },
        status: 'created'
      },
      include: retailOrderInclude,
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }

  async getCurrentOrder(authContext: AuthContext) {
    const buyerProfileIds = await this.getBuyerProfileIds(authContext);

    if (!buyerProfileIds.length) {
      return null;
    }

    return this.prismaService.client.retailOrder.findFirst({
      where: {
        buyerProfileId: {
          in: buyerProfileIds
        },
        status: {
          in: ['created', 'pending', 'paid', 'shipped']
        }
      },
      include: retailOrderInclude,
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }

  async createOrder(input: CreateRetailOrderInput, authContext?: AuthContext) {
    const buyerProfileId = await this.resolveBuyerProfileId(input.buyerProfileId, authContext);
    if (!input.items.length) {
      throw new ConflictException('Retail orders require at least one item.');
    }

    const products = await this.loadProducts(input.items.map((item) => item.productId));
    const pricedItems = this.buildPricedItems(input.items, products);
    const supplierProfileId = pricedItems[0]?.product.sellerProfileId ?? null;
    const currency = pricedItems[0]?.currency ?? 'USD';
    const totalAmountMinor = pricedItems.reduce((total, item) => total + item.lineAmountMinor, 0);

    return this.prismaService.client.retailOrder.create({
      data: {
        buyerProfile: {
          connect: {
            id: buyerProfileId
          }
        },
        ...(supplierProfileId
          ? {
              supplierProfile: {
                connect: {
                  id: supplierProfileId
                }
              }
            }
          : {}),
        status: 'created',
        paymentStatus: 'pending',
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
      include: retailOrderInclude
    });
  }

  async addItemToCart(authContext: AuthContext, input: { productId: string; quantity: number }) {
    const buyerProfileId = await this.resolveBuyerProfileId(undefined, authContext);
    const product = await this.loadProduct(input.productId);
    const activePrice = product.prices[0];
    if (!activePrice) {
      throw new ConflictException(`Product ${product.id} does not have an active price.`);
    }

    const cart = await this.getOrCreateCart(buyerProfileId, product.sellerProfileId, activePrice);

    if (cart.supplierProfileId && cart.supplierProfileId !== product.sellerProfileId) {
      throw new ConflictException('Retail cart currently supports one supplier at a time.');
    }

    const existingItem = cart.items.find((item) => item.productId === product.id);
    const quantity = Math.max(1, input.quantity);

    if (existingItem) {
      await this.prismaService.client.retailOrderItem.update({
        where: { id: existingItem.id },
        data: {
          quantity
        }
      });
    } else {
      await this.prismaService.client.retailOrderItem.create({
        data: {
          retailOrderId: cart.id,
          productId: product.id,
          quantity,
          unitAmountMinor: product.prices[0]!.amountMinor,
          lineAmountMinor: product.prices[0]!.amountMinor * quantity,
          currency: product.prices[0]!.currency,
          productName: product.name,
          productSlug: product.slug
        }
      });
    }

    await this.updateOrderSnapshot(cart.id);
    return this.getOrderById(cart.id, authContext);
  }

  async updateCartItemQuantity(authContext: AuthContext, itemId: string, input: UpdateCartItemInput) {
    const item = await this.prismaService.client.retailOrderItem.findUnique({
      where: { id: itemId },
      include: {
        retailOrder: true
      }
    });

    if (!item) {
      throw new NotFoundException(`Retail order item ${itemId} was not found.`);
    }

    await this.assertOrderAccess(authContext, item.retailOrder);

    if (item.retailOrder.status !== 'created') {
      throw new ConflictException('Cart items can only be changed while the order is still a cart.');
    }

    const quantity = Math.max(1, input.quantity);

    await this.prismaService.client.retailOrderItem.update({
      where: { id: itemId },
      data: {
        quantity,
        lineAmountMinor: item.unitAmountMinor * quantity
      }
    });

    await this.updateOrderSnapshot(item.retailOrderId);
    return this.getOrderById(item.retailOrderId, authContext);
  }

  async removeCartItem(authContext: AuthContext, itemId: string) {
    const item = await this.prismaService.client.retailOrderItem.findUnique({
      where: { id: itemId },
      include: {
        retailOrder: true
      }
    });

    if (!item) {
      throw new NotFoundException(`Retail order item ${itemId} was not found.`);
    }

    await this.assertOrderAccess(authContext, item.retailOrder);

    if (item.retailOrder.status !== 'created') {
      throw new ConflictException('Cart items can only be removed while the order is still a cart.');
    }

    await this.prismaService.client.retailOrderItem.delete({
      where: { id: itemId }
    });

    await this.updateOrderSnapshot(item.retailOrderId);
    return this.getOrderById(item.retailOrderId, authContext);
  }

  async checkoutOrder(authContext: AuthContext, orderId: string, address: CartAddressInput) {
    const order = await this.getOrderById(orderId, authContext);

    if (order.status !== 'created') {
      throw new ConflictException(`Retail order ${orderId} cannot checkout from ${order.status}.`);
    }

    if (!order.items.length) {
      throw new ConflictException('Retail order must have at least one item before checkout.');
    }

    const checkedOut = await this.prismaService.client.retailOrder.update({
      where: { id: orderId },
      data: {
        status: 'pending',
        shippingAddress: address as unknown as Prisma.InputJsonValue,
        paymentStatus: 'pending'
      },
      include: retailOrderInclude
    });

    return checkedOut;
  }

  async submitPayment(authContext: AuthContext, orderId: string, input: SubmitPaymentInput) {
    const order = await this.getOrderById(orderId, authContext);

    if (!['pending', 'paid'].includes(order.status)) {
      throw new ConflictException(`Retail order ${orderId} cannot take payment from ${order.status}.`);
    }

    if (input.simulateFailure) {
      return this.prismaService.client.retailOrder.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'failed'
        },
        include: retailOrderInclude
      });
    }

    const transactionId = order.paymentTransactionId ?? randomUUID();

    return this.prismaService.client.retailOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'pending',
        paymentTransactionId: transactionId
      },
      include: retailOrderInclude
    });
  }

  async shipOrder(authContext: AuthContext, orderId: string) {
    const order = await this.getOrderById(orderId, authContext);

    if (order.status !== 'paid') {
      throw new ConflictException(`Retail order ${orderId} cannot be shipped from ${order.status}.`);
    }

    return this.prismaService.client.retailOrder.update({
      where: { id: orderId },
      data: {
        status: 'shipped'
      },
      include: retailOrderInclude
    });
  }

  async confirmDelivery(authContext: AuthContext, orderId: string) {
    const order = await this.getOrderById(orderId, authContext);

    if (order.status !== 'shipped') {
      throw new ConflictException(`Retail order ${orderId} cannot be delivered from ${order.status}.`);
    }

    return this.prismaService.client.retailOrder.update({
      where: { id: orderId },
      data: {
        status: 'delivered'
      },
      include: retailOrderInclude
    });
  }

  async updateOrderStatus(id: string, input: UpdateRetailOrderStatusInput, authContext?: AuthContext) {
    const existing = await this.getOrderById(id, authContext);
    const nextStatus = input.status;

    const allowedTransitions: Record<RetailOrderStatus, RetailOrderStatus[]> = {
      created: ['pending', 'cancelled'],
      pending: ['paid', 'cancelled'],
      paid: ['shipped', 'cancelled', 'fulfilled'],
      shipped: ['delivered'],
      delivered: [],
      fulfilled: ['delivered'],
      cancelled: []
    };

    const allowedNextStatuses = allowedTransitions[existing.status as RetailOrderStatus] ?? [];

    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new ConflictException(`Retail order cannot transition from ${existing.status} to ${nextStatus}.`);
    }

    const payload: Prisma.RetailOrderUncheckedUpdateInput = {
      status: nextStatus
    };

    if (nextStatus === 'paid') {
      payload.paymentStatus = 'paid';
      payload.paymentTransactionId = existing.paymentTransactionId ?? randomUUID();
    }

    if (nextStatus === 'pending') {
      payload.paymentStatus = 'pending';
    }

    return this.prismaService.client.retailOrder.update({
      where: { id },
      data: payload,
      include: retailOrderInclude
    });
  }

  async getHistory(id: string, authContext: AuthContext) {
    const order = await this.getOrderById(id, authContext);
    const auditEvents = await this.prismaService.client.auditEvent.findMany({
      where: {
        subjectType: 'retail-order',
        subjectId: order.id
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return {
      order,
      history: auditEvents
    };
  }

  private async getOrCreateCart(buyerProfileId: string, supplierProfileId: string, price: { amountMinor: number; currency: string }) {
    const existing = await this.prismaService.client.retailOrder.findFirst({
      where: {
        buyerProfileId,
        status: 'created'
      },
      include: retailOrderInclude,
      orderBy: {
        updatedAt: 'desc'
      }
    });

    if (existing) {
      if (existing.supplierProfileId && existing.supplierProfileId !== supplierProfileId) {
        throw new ConflictException('Retail cart currently supports one supplier at a time.');
      }

      return existing;
    }

    return this.prismaService.client.retailOrder.create({
      data: {
        buyerProfile: {
          connect: {
            id: buyerProfileId
          }
        },
        supplierProfile: {
          connect: {
            id: supplierProfileId
          }
        },
        status: 'created',
        paymentStatus: 'pending',
        currency: price.currency,
        totalAmountMinor: 0
      },
      include: retailOrderInclude
    });
  }

  private async buildAccessWhere(authContext: AuthContext) {
    if (authContext.roles.includes('platform_admin')) {
      return null;
    }

    const buyerProfileIds = await this.getBuyerProfileIds(authContext);
    const sellerProfileIds = await this.getSellerProfileIds(authContext);

    const clauses: Prisma.RetailOrderWhereInput[] = [];

    if (buyerProfileIds.length) {
      clauses.push({
        buyerProfileId: {
          in: buyerProfileIds
        }
      });
    }

    if (sellerProfileIds.length) {
      clauses.push({
        supplierProfileId: {
          in: sellerProfileIds
        }
      });
    }

    if (!clauses.length) {
      return {
        id: '__no_access__'
      };
    }

    return {
      OR: clauses
    };
  }

  private async resolveBuyerProfileId(explicitBuyerProfileId: string | undefined, authContext?: AuthContext) {
    if (explicitBuyerProfileId) {
      const profile = await this.prismaService.client.buyerProfile.findUnique({
        where: { id: explicitBuyerProfileId },
        select: { id: true }
      });

      if (!profile) {
        throw new NotFoundException(`Buyer profile ${explicitBuyerProfileId} was not found.`);
      }

      return profile.id;
    }

    if (!authContext) {
      throw new ConflictException('Buyer profile is required.');
    }

    const ids = await this.getBuyerProfileIds(authContext);
    const buyerProfileId = ids[0];

    if (!buyerProfileId) {
      throw new NotFoundException('No buyer profile was found for the current session.');
    }

    return buyerProfileId;
  }

  private async getBuyerProfileIds(authContext: AuthContext) {
    return this.findScopedProfileIds('buyer', authContext);
  }

  private async getSellerProfileIds(authContext: AuthContext) {
    return this.findScopedProfileIds('seller', authContext);
  }

  private async assertOrderAccess(authContext: AuthContext, order: RetailOrderIdentity) {
    if (authContext.roles.includes('platform_admin')) {
      return;
    }

    const buyerProfileIds = new Set(await this.getBuyerProfileIds(authContext));
    const sellerProfileIds = new Set(await this.getSellerProfileIds(authContext));

    const canAccess =
      (order.buyerProfileId && buyerProfileIds.has(order.buyerProfileId)) ||
      (order.supplierProfileId && sellerProfileIds.has(order.supplierProfileId));

    if (!canAccess) {
      throw new ConflictException(`Access to retail order ${order.id} is not allowed.`);
    }
  }

  private async updateOrderSnapshot(orderId: string) {
    const order = await this.prismaService.client.retailOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true
      }
    });

    if (!order) {
      throw new NotFoundException(`Retail order ${orderId} was not found.`);
    }

    const totalAmountMinor = order.items.reduce((total, item) => total + item.lineAmountMinor, 0);
    const currency = order.items[0]?.currency ?? order.currency;

    await this.prismaService.client.retailOrder.update({
      where: { id: orderId },
      data: {
        totalAmountMinor,
        ...(currency ? { currency } : {})
      }
    });
  }

  private async loadProducts(productIds: string[]) {
    const products = await this.prismaService.client.product.findMany({
      where: {
        id: {
          in: productIds
        },
        status: 'published'
      },
      include: {
        sellerProfile: true,
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

    return products;
  }

  private async loadProduct(productId: string) {
    const products = await this.loadProducts([productId]);
    const product = products[0];

    if (!product) {
      throw new NotFoundException(`Product ${productId} was not found.`);
    }

    const activePrice = product.prices[0];
    if (!activePrice) {
      throw new ConflictException(`Product ${productId} does not have an active price.`);
    }

    return {
      ...product,
      prices: [activePrice]
    };
  }

  private buildPricedItems(
    items: CreateRetailOrderInput['items'],
    products: Awaited<ReturnType<RetailOrdersCheckoutRepository['loadProducts']>>
  ) {
    return items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      const activePrice = product?.prices[0];

      if (!product || !activePrice) {
        throw new ConflictException(`Product ${item.productId} does not have an active price.`);
      }

      return {
        product,
        quantity: Math.max(1, item.quantity),
        unitAmountMinor: activePrice.amountMinor,
        lineAmountMinor: activePrice.amountMinor * Math.max(1, item.quantity),
        currency: activePrice.currency
      };
    });
  }

  private async findScopedProfileIds(kind: 'buyer' | 'seller', authContext: AuthContext) {
    if (!authContext.internalUserId && !authContext.tenantId) {
      return [];
    }

    const roleMatches =
      kind === 'buyer'
        ? authContext.roles.includes('customer_user') || authContext.roles.includes('platform_admin')
        : authContext.roles.includes('supplier_user') || authContext.roles.includes('platform_admin');

    if (authContext.internalUserId) {
      const userProfiles =
        kind === 'buyer'
          ? await this.prismaService.client.buyerProfile.findMany({
              where: {
                userId: authContext.internalUserId
              },
              select: {
                id: true
              }
            })
          : await this.prismaService.client.sellerProfile.findMany({
              where: {
                userId: authContext.internalUserId
              },
              select: {
                id: true
              }
            });

      if (userProfiles.length) {
        return userProfiles.map((profile: { id: string }) => profile.id);
      }
    }

    if (roleMatches && authContext.tenantId) {
      const tenantProfiles =
        kind === 'buyer'
          ? await this.prismaService.client.buyerProfile.findMany({
              where: {
                tenantId: authContext.tenantId
              },
              select: {
                id: true
              }
            })
          : await this.prismaService.client.sellerProfile.findMany({
              where: {
                tenantId: authContext.tenantId
              },
              select: {
                id: true
              }
            });

      return tenantProfiles.map((profile: { id: string }) => profile.id);
    }

    return [];
  }
}
