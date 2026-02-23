import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { DLocalProvider } from './providers/dlocal.provider';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { Request } from 'express';

@Controller()
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private dLocalProvider: DLocalProvider,
    private mercadoPagoProvider: MercadoPagoProvider,
  ) {}

  @Post('payments/create')
  async createPayment(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(user.id, dto);
  }

  @Public()
  @Post('webhooks/mercadopago')
  @HttpCode(HttpStatus.OK)
  async handleMercadoPagoWebhook(
    @Headers('x-signature') xSignature: string,
    @Headers('x-request-id') xRequestId: string,
    @Query('type') type: string,
    @Query('data.id') dataId: string,
    @Body() body: any,
  ) {
    // Validate webhook signature if present
    const paymentId = body?.data?.id || dataId;
    if (xSignature && !(await this.mercadoPagoProvider.validateWebhookSignature(xSignature, xRequestId, String(paymentId || '')))) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // MercadoPago sends different notification formats
    // New format: body.action and body.data.id
    // Old format: query params type and data.id
    const notificationType = body?.action || type;

    if (notificationType === 'payment.created' || notificationType === 'payment.updated' || type === 'payment') {
      if (paymentId) {
        await this.paymentsService.processMercadoPagoWebhook(String(paymentId));
      }
    }

    return { status: 'ok' };
  }

  @Public()
  @Post('webhooks/dlocal')
  @HttpCode(HttpStatus.OK)
  async handleDLocalWebhook(
    @Headers('x-dlocal-signature') signature: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    // Validate HMAC signature
    const rawBody = (req as any).rawBody?.toString() || JSON.stringify(body);

    if (signature && !(await this.dLocalProvider.validateWebhookSignature(rawBody, signature))) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    await this.paymentsService.processDLocalWebhook(body);

    return { status: 'ok' };
  }

  @Public()
  @Post('payments/simulation/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmSimulationPayment(
    @Body() body: { orderId: string; action: 'approve' | 'reject' },
  ) {
    return this.paymentsService.processSimulationPayment(body.orderId, body.action);
  }
}
