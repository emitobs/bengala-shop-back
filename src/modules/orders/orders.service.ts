import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import { CouponsService } from '../coupons/coupons.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { generateOrderNumber } from '../../common/utils/order-number.util';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private shippingService: ShippingService,
    private couponsService: CouponsService,
  ) {}

  async createFromCart(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Validate all items in stock
    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new BadRequestException(
          `Product "${item.product.name}" is no longer available`,
        );
      }
      if (item.variant && item.variant.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.product.name}" (${item.variant.name}). Available: ${item.variant.stock}`,
        );
      }
    }

    // Get and validate address
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum, item) => {
      const basePrice = Number(item.product.basePrice);
      const priceAdjustment = item.variant
        ? Number(item.variant.priceAdjustment)
        : 0;
      return sum + (basePrice + priceAdjustment) * item.quantity;
    }, 0);

    // Calculate shipping
    const shipping = await this.shippingService.calculateShipping(
      address.department,
      subtotal,
    );

    // Apply coupon discount
    let discount = 0;
    if (dto.couponCode) {
      const couponResult = await this.couponsService.validate({
        code: dto.couponCode,
        subtotal,
      });
      discount = couponResult.discount;
    }

    const total = subtotal + shipping.cost - discount;

    // Generate order number
    const orderCount = await this.prisma.order.count();
    const orderNumber = generateOrderNumber(orderCount + 1);

    // Create order with items in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: dto.addressId,
          status: 'PENDING',
          subtotal,
          shippingCost: shipping.cost,
          discount,
          total,
          notes: dto.notes,
          shippingMethod: dto.shippingMethod ?? shipping.zoneName,
          estimatedDelivery: new Date(
            Date.now() + shipping.estimatedDays * 24 * 60 * 60 * 1000,
          ),
          shippingAddress: {
            recipientName: address.recipientName,
            street: address.street,
            number: address.number,
            apartment: address.apartment,
            city: address.city,
            department: address.department,
            postalCode: address.postalCode,
            phone: address.phone,
          },
          items: {
            create: cart.items.map((item) => {
              const basePrice = Number(item.product.basePrice);
              const priceAdjustment = item.variant
                ? Number(item.variant.priceAdjustment)
                : 0;
              const unitPrice = basePrice + priceAdjustment;

              return {
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                unitPrice,
                totalPrice: unitPrice * item.quantity,
                productName: item.product.name,
                productSku: item.product.sku,
                variantName: item.variant?.name ?? null,
              };
            }),
          },
          payment: {
            create: {
              provider: dto.paymentProvider,
              status: 'PENDING',
              amount: total,
              currency: 'UYU',
            },
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: 'PENDING',
              note: 'Order created',
            },
          },
        },
        include: {
          items: true,
          payment: true,
          statusHistory: true,
        },
      });

      // Stock is decremented on payment approval (payments.service.ts)
      // NOT here — to avoid double decrement

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    });

    // Increment coupon usage after successful order creation
    if (dto.couponCode) {
      await this.couponsService.incrementUsage(dto.couponCode);
    }

    return order;
  }

  async findAllByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
          payment: { select: { id: true, status: true, provider: true, externalId: true, amount: true, currency: true, paidAt: true, createdAt: true } },
        },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: orders.map((order) => this.mapOrder(order)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findById(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
            variant: true,
          },
        },
        payment: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrder(order);
  }

  async findByIdAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        address: true,
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
            variant: true,
          },
        },
        payment: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrder(order);
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    changedBy: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: dto.status as any },
        include: {
          items: true,
          payment: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: dto.status as any,
          note: dto.note,
          changedBy,
        },
      });

      return updated;
    });

    return updatedOrder;
  }

  async findByOrderNumber(orderNumber: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber, userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        payment: { select: { id: true, status: true, provider: true, externalId: true, amount: true, currency: true, paidAt: true, createdAt: true } },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrder(order);
  }

  async findAllAdmin(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (status) {
      where.status = status as any;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                include: {
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
          payment: { select: { id: true, status: true, provider: true, externalId: true, amount: true, currency: true, paidAt: true, createdAt: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: orders.map((order) => this.mapOrder(order)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  private mapOrder(order: any) {
    const { items, payment, ...rest } = order;

    return {
      ...rest,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      discount: Number(order.discount),
      total: Number(order.total),
      items: items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId ?? null,
        name: item.productName,
        variantName: item.variantName ?? null,
        imageUrl: item.product?.images?.[0]?.url ?? null,
        price: Number(item.unitPrice),
        quantity: item.quantity,
        subtotal: Number(item.totalPrice),
      })),
      payment: payment
        ? {
            id: payment.id,
            provider: payment.provider,
            externalId: payment.externalId ?? null,
            status: payment.status,
            amount: Number(payment.amount),
            currency: payment.currency,
            paidAt: payment.paidAt,
            createdAt: payment.createdAt,
          }
        : null,
    };
  }
}
