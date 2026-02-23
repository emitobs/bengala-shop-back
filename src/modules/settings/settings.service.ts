import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { encrypt, decrypt } from '../../common/utils/crypto.util';

const DEFAULT_ID = 'default';

export interface PaymentCredentials {
  mpAccessToken: string | null;
  mpPublicKey: string | null;
  mpWebhookSecret: string | null;
  dlApiKey: string | null;
  dlSecretKey: string | null;
  dlApiUrl: string | null;
}

@Injectable()
export class SettingsService {
  private readonly encryptionKey: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.encryptionKey = this.configService.get<string>(
      'SETTINGS_ENCRYPTION_KEY',
      'bengala-max-default-encryption-key-change-in-production',
    );
  }

  /** Public settings — excludes payment credentials. */
  async getSettings() {
    const settings = await this.prisma.storeSettings.upsert({
      where: { id: DEFAULT_ID },
      update: {},
      create: { id: DEFAULT_ID },
    });

    return {
      id: settings.id,
      hideOutOfStock: settings.hideOutOfStock,
      announcementBar: settings.announcementBar,
      mpEnabled: settings.mpEnabled,
      dlEnabled: settings.dlEnabled,
      updatedAt: settings.updatedAt,
    };
  }

  /** Returns masked payment credentials for admin display. */
  async getPaymentSettingsForAdmin() {
    const settings = await this.prisma.storeSettings.upsert({
      where: { id: DEFAULT_ID },
      update: {},
      create: { id: DEFAULT_ID },
    });

    return {
      mercadopago: {
        accessToken: this.maskValue(this.decryptField(settings.mpAccessToken)),
        publicKey: this.maskValue(this.decryptField(settings.mpPublicKey)),
        webhookSecret: this.maskValue(this.decryptField(settings.mpWebhookSecret)),
      },
      dlocal: {
        apiKey: this.maskValue(this.decryptField(settings.dlApiKey)),
        secretKey: this.maskValue(this.decryptField(settings.dlSecretKey)),
        apiUrl: settings.dlApiUrl || null,
      },
    };
  }

  /** Returns decrypted payment credentials for internal use by providers. */
  async getPaymentCredentials(): Promise<PaymentCredentials> {
    const settings = await this.prisma.storeSettings.findUnique({
      where: { id: DEFAULT_ID },
    });

    if (!settings) {
      return {
        mpAccessToken: null,
        mpPublicKey: null,
        mpWebhookSecret: null,
        dlApiKey: null,
        dlSecretKey: null,
        dlApiUrl: null,
      };
    }

    return {
      mpAccessToken: this.decryptField(settings.mpAccessToken),
      mpPublicKey: this.decryptField(settings.mpPublicKey),
      mpWebhookSecret: this.decryptField(settings.mpWebhookSecret),
      dlApiKey: this.decryptField(settings.dlApiKey),
      dlSecretKey: this.decryptField(settings.dlSecretKey),
      dlApiUrl: settings.dlApiUrl || null,
    };
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const data: Record<string, any> = {};

    if (dto.hideOutOfStock !== undefined) {
      data.hideOutOfStock = dto.hideOutOfStock;
    }
    if (dto.announcementBar !== undefined) {
      data.announcementBar = dto.announcementBar || null;
    }
    if (dto.mpEnabled !== undefined) {
      data.mpEnabled = dto.mpEnabled;
    }
    if (dto.dlEnabled !== undefined) {
      data.dlEnabled = dto.dlEnabled;
    }

    // Payment credentials — encrypt before storing
    if (dto.mpAccessToken !== undefined) {
      data.mpAccessToken = dto.mpAccessToken ? encrypt(dto.mpAccessToken, this.encryptionKey) : null;
    }
    if (dto.mpPublicKey !== undefined) {
      data.mpPublicKey = dto.mpPublicKey ? encrypt(dto.mpPublicKey, this.encryptionKey) : null;
    }
    if (dto.mpWebhookSecret !== undefined) {
      data.mpWebhookSecret = dto.mpWebhookSecret ? encrypt(dto.mpWebhookSecret, this.encryptionKey) : null;
    }
    if (dto.dlApiKey !== undefined) {
      data.dlApiKey = dto.dlApiKey ? encrypt(dto.dlApiKey, this.encryptionKey) : null;
    }
    if (dto.dlSecretKey !== undefined) {
      data.dlSecretKey = dto.dlSecretKey ? encrypt(dto.dlSecretKey, this.encryptionKey) : null;
    }
    if (dto.dlApiUrl !== undefined) {
      data.dlApiUrl = dto.dlApiUrl || null;
    }

    const settings = await this.prisma.storeSettings.upsert({
      where: { id: DEFAULT_ID },
      update: data,
      create: { id: DEFAULT_ID, ...data },
    });

    return {
      id: settings.id,
      hideOutOfStock: settings.hideOutOfStock,
      announcementBar: settings.announcementBar,
      mpEnabled: settings.mpEnabled,
      dlEnabled: settings.dlEnabled,
      updatedAt: settings.updatedAt,
    };
  }

  private decryptField(value: string | null): string | null {
    if (!value) return null;
    try {
      return decrypt(value, this.encryptionKey);
    } catch {
      return null;
    }
  }

  private maskValue(value: string | null): string | null {
    if (!value) return null;
    if (value.length <= 8) return '••••••••';
    return '••••••••' + value.slice(-4);
  }
}
