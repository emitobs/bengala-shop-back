import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { SettingsService } from '../../settings/settings.service';

interface OrderForPayment {
  id: string;
  orderNumber: string;
  total: number;
}

@Injectable()
export class DLocalProvider {
  private readonly logger = new Logger(DLocalProvider.name);

  constructor(
    private configService: ConfigService,
    private settingsService: SettingsService,
  ) {}

  private async getCredentials() {
    const creds = await this.settingsService.getPaymentCredentials();
    return {
      baseUrl: creds.dlApiUrl || this.configService.get('DLOCAL_API_URL', 'https://api-sbx.dlocalgo.com/v1'),
      apiKey: creds.dlApiKey || this.configService.get('DLOCAL_API_KEY', ''),
      secretKey: creds.dlSecretKey || this.configService.get('DLOCAL_SECRET_KEY', ''),
    };
  }

  async createPayment(order: OrderForPayment) {
    const { baseUrl, apiKey, secretKey } = await this.getCredentials();
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
    const apiUrl = this.configService.get('API_URL', 'http://localhost:3000');

    if (!apiKey) {
      throw new Error('dLocal API key not configured');
    }

    const response = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}:${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: order.total,
        currency: 'UYU',
        country: 'UY',
        description: `Bengala Max - Pedido #${order.orderNumber}`,
        order_id: order.id,
        notification_url: `${apiUrl}/api/webhooks/dlocal`,
        success_url: `${frontendUrl}/pago/exito?order=${order.id}`,
        back_url: `${frontendUrl}/pago/error?order=${order.id}`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`dLocal payment creation failed: ${error}`);
      throw new Error(`dLocal payment creation failed: ${response.status}`);
    }

    const data: any = await response.json();

    return {
      paymentId: data.id,
      paymentUrl: data.redirect_url,
    };
  }

  async validateWebhookSignature(rawBody: string, receivedSignature: string): Promise<boolean> {
    const { secretKey } = await this.getCredentials();
    if (!secretKey || !receivedSignature) return false;

    try {
      const computedSignature = createHmac('sha256', secretKey)
        .update(rawBody)
        .digest('hex');

      return timingSafeEqual(
        Buffer.from(computedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex'),
      );
    } catch {
      return false;
    }
  }

  mapPaymentStatus(dlocalStatus: string): string {
    const statusMap: Record<string, string> = {
      COMPLETED: 'APPROVED',
      PENDING: 'PENDING',
      FAILED: 'REJECTED',
      CANCELLED: 'CANCELLED',
      REFUNDED: 'REFUNDED',
    };
    return statusMap[dlocalStatus] || 'PENDING';
  }
}
