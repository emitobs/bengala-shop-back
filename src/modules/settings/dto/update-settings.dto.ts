import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsBoolean()
  @IsOptional()
  hideOutOfStock?: boolean;

  @IsString()
  @IsOptional()
  announcementBar?: string;

  // MercadoPago
  @IsBoolean()
  @IsOptional()
  mpEnabled?: boolean;

  @IsString()
  @IsOptional()
  mpAccessToken?: string;

  @IsString()
  @IsOptional()
  mpPublicKey?: string;

  @IsString()
  @IsOptional()
  mpWebhookSecret?: string;

  // dLocal Go
  @IsBoolean()
  @IsOptional()
  dlEnabled?: boolean;

  @IsString()
  @IsOptional()
  dlApiKey?: string;

  @IsString()
  @IsOptional()
  dlSecretKey?: string;

  @IsString()
  @IsOptional()
  dlApiUrl?: string;
}
