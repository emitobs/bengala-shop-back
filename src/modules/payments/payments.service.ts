import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { DLocalProvider } from './providers/dlocal.provider';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mercadoPagoProvider: MercadoPagoProvider,
    private dLocalProvider: DLocalProvider,
  ) {}

  async createPayment(userId: string, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: true,
        payment: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new BadRequestException('Order does not belong to user');
    if (order.payment?.status === 'APPROVED') {
      throw new BadRequestException('Order already paid');
    }

    const orderForPayment = {
      id: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
    };

    if (dto.provider === 'MERCADOPAGO') {
      const result = await this.mercadoPagoProvider.createPreference(orderForPayment);

      // Create or update payment record
      await this.prisma.payment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          provider: 'MERCADOPAGO',
          status: 'PENDING',
          externalId: result.preferenceId,
          amount: order.total,
          currency: 'UYU',
        },
        update: {
          provider: 'MERCADOPAGO',
          status: 'PENDING',
          externalId: result.preferenceId,
        },
      });

      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAYMENT_PENDING },
      });

      return {
        provider: 'MERCADOPAGO',
        preferenceId: result.preferenceId,
        initPoint: result.initPoint,
        sandboxInitPoint: result.sandboxInitPoint,
      };
    }

    if (dto.provider === 'DLOCAL_GO') {
      const result = await this.dLocalProvider.createPayment(orderForPayment);

      await this.prisma.payment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          provider: 'DLOCAL_GO',
          status: 'PENDING',
          externalId: result.paymentId,
          amount: order.total,
          currency: 'UYU',
        },
        update: {
          provider: 'DLOCAL_GO',
          status: 'PENDING',
          externalId: result.paymentId,
        },
      });

      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAYMENT_PENDING },
      });

      return {
        provider: 'DLOCAL_GO',
        paymentUrl: result.paymentUrl,
      };
    }

    if (dto.provider === 'SIMULATION') {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');

      await this.prisma.payment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          provider: 'SIMULATION',
          status: 'PENDING',
          externalId: order.id,
          amount: order.total,
          currency: 'UYU',
        },
        update: {
          provider: 'SIMULATION',
          status: 'PENDING',
          externalId: order.id,
        },
      });

      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAYMENT_PENDING },
      });

      return {
        provider: 'SIMULATION',
        paymentUrl: `${frontendUrl}/pago/simulacion?order=${order.id}`,
      };
    }

    throw new BadRequestException('Invalid payment provider');
  }

  async processMercadoPagoWebhook(paymentId: string) {
    this.logger.log(`Processing MercadoPago webhook for payment: ${paymentId}`);

    const mpPayment = await this.mercadoPagoProvider.getPaymentDetails(paymentId);
    const orderId = mpPayment.externalReference;

    if (!orderId) {
      this.logger.warn(`No external reference found for MP payment ${paymentId}`);
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId },
    });

    if (!payment) {
      this.logger.warn(`No payment record found for order ${orderId}`);
      return;
    }

    const newStatus = this.mercadoPagoProvider.mapPaymentStatus(mpPayment.status || '') as PaymentStatus;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        externalPaymentId: mpPayment.id,
        paymentMethod: mpPayment.paymentMethod,
        paymentDetail: mpPayment as any,
        paidAt: newStatus === 'APPROVED' ? new Date(mpPayment.paidAt || Date.now()) : undefined,
      },
    });

    await this.updateOrderFromPayment(orderId, newStatus);
  }

  async processDLocalWebhook(body: any) {
    this.logger.log(`Processing dLocal webhook: ${JSON.stringify(body)}`);

    const orderId = body.order_id;
    if (!orderId) {
      this.logger.warn('No order_id in dLocal webhook body');
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId },
    });

    if (!payment) {
      this.logger.warn(`No payment record found for order ${orderId}`);
      return;
    }

    const newStatus = this.dLocalProvider.mapPaymentStatus(body.status || '') as PaymentStatus;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        externalPaymentId: body.id,
        paymentMethod: body.payment_method,
        paymentDetail: body,
        paidAt: newStatus === 'APPROVED' ? new Date() : undefined,
      },
    });

    await this.updateOrderFromPayment(orderId, newStatus);
  }

  async processSimulationPayment(orderId: string, action: 'approve' | 'reject') {
    if (this.configService.get('NODE_ENV') === 'production') {
      throw new ForbiddenException('Simulation mode is not available in production');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId, provider: 'SIMULATION' },
    });

    if (!payment) {
      throw new NotFoundException('Simulation payment not found for this order');
    }

    const newStatus: PaymentStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        paymentMethod: 'simulation',
        paidAt: newStatus === 'APPROVED' ? new Date() : undefined,
      },
    });

    await this.updateOrderFromPayment(orderId, newStatus);

    return { status: newStatus };
  }

  private async updateOrderFromPayment(orderId: string, paymentStatus: PaymentStatus) {
    let newOrderStatus: OrderStatus;

    switch (paymentStatus) {
      case 'APPROVED':
        newOrderStatus = OrderStatus.PAID;
        break;
      case 'REJECTED':
      case 'CANCELLED':
        newOrderStatus = OrderStatus.CANCELLED;
        break;
      case 'REFUNDED':
        newOrderStatus = OrderStatus.REFUNDED;
        break;
      default:
        newOrderStatus = OrderStatus.PAYMENT_PENDING;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    if (!order) return;

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: newOrderStatus },
      }),
      this.prisma.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: newOrderStatus,
          note: `Payment status updated to ${paymentStatus}`,
          changedBy: 'system',
        },
      }),
    ]);

    // Decrement stock on successful payment
    if (paymentStatus === 'APPROVED') {
      await this.decrementStock(orderId);
    }
  }

  private async decrementStock(orderId: string) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId },
    });

    for (const item of orderItems) {
      if (item.variantId) {
        await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    this.logger.log(`Stock decremented for order ${orderId}`);
  }
}
