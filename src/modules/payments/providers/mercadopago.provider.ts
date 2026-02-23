import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment as MPPayment } from 'mercadopago';
import { createHmac } from 'crypto';
import { SettingsService } from '../../settings/settings.service';

interface OrderForPayment {
  id: string;
  orderNumber: string;
  total: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

@Injectable()
export class MercadoPagoProvider {
  private readonly logger = new Logger(MercadoPagoProvider.name);
  private cachedAccessToken: string | null = null;
  private client: MercadoPagoConfig | null = null;
  private preferenceApi: Preference | null = null;
  private paymentApi: MPPayment | null = null;

  constructor(
    private configService: ConfigService,
    private settingsService: SettingsService,
  ) {}

  private async ensureClient(): Promise<{ preferenceApi: Preference; paymentApi: MPPayment }> {
    const creds = await this.settingsService.getPaymentCredentials();
    const accessToken = creds.mpAccessToken || this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN') || '';

    if (!accessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    if (accessToken !== this.cachedAccessToken) {
      this.client = new MercadoPagoConfig({ accessToken });
      this.preferenceApi = new Preference(this.client);
      this.paymentApi = new MPPayment(this.client);
      this.cachedAccessToken = accessToken;
      this.logger.log('MercadoPago client initialized/refreshed');
    }

    return { preferenceApi: this.preferenceApi!, paymentApi: this.paymentApi! };
  }

  private async getWebhookSecret(): Promise<string | undefined> {
    const creds = await this.settingsService.getPaymentCredentials();
    return creds.mpWebhookSecret || this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
  }

  async createPreference(order: OrderForPayment) {
    const { preferenceApi } = await this.ensureClient();
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
    const apiUrl = this.configService.get('API_URL', 'http://localhost:3000');

    const preference = await preferenceApi.create({
      body: {
        items: order.items.map((item) => ({
          id: item.productId,
          title: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          currency_id: 'UYU',
        })),
        back_urls: {
          success: `${frontendUrl}/pago/exito?order=${order.id}`,
          failure: `${frontendUrl}/pago/error?order=${order.id}`,
          pending: `${frontendUrl}/pago/pendiente?order=${order.id}`,
        },
        auto_return: 'approved',
        notification_url: `${apiUrl}/api/webhooks/mercadopago`,
        external_reference: order.id,
        statement_descriptor: 'BENGALA MAX',
      },
    });

    return {
      preferenceId: preference.id!,
      initPoint: preference.init_point!,
      sandboxInitPoint: preference.sandbox_init_point,
    };
  }

  async getPaymentDetails(paymentId: string) {
    const { paymentApi } = await this.ensureClient();
    const payment = await paymentApi.get({ id: paymentId });
    return {
      id: String(payment.id),
      status: payment.status,
      statusDetail: payment.status_detail,
      externalReference: payment.external_reference,
      paymentMethod: payment.payment_method_id,
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      paidAt: payment.date_approved,
    };
  }

  /**
   * Validates MercadoPago webhook signature.
   * MercadoPago sends x-signature header with format: "ts=...,v1=..."
   * The signature is HMAC-SHA256 of "id:{dataId};request-id:{xRequestId};ts:{ts};"
   */
  async validateWebhookSignature(xSignature: string, xRequestId: string, dataId: string): Promise<boolean> {
    const webhookSecret = await this.getWebhookSecret();
    if (!webhookSecret) return true;

    const parts = xSignature.split(',');
    let ts: string | undefined;
    let hash: string | undefined;

    for (const part of parts) {
      const [key, value] = part.split('=').map((s) => s.trim());
      if (key === 'ts') ts = value;
      if (key === 'v1') hash = value;
    }

    if (!ts || !hash) return false;

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const computed = createHmac('sha256', webhookSecret).update(manifest).digest('hex');

    return computed === hash;
  }

  mapPaymentStatus(mpStatus: string): string {
    const statusMap: Record<string, string> = {
      approved: 'APPROVED',
      pending: 'PENDING',
      in_process: 'IN_PROCESS',
      rejected: 'REJECTED',
      cancelled: 'CANCELLED',
      refunded: 'REFUNDED',
      charged_back: 'REFUNDED',
    };
    return statusMap[mpStatus] || 'PENDING';
  }
}
