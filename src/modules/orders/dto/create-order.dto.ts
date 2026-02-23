import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  addressId: string;

  @IsString()
  @IsOptional()
  shippingMethod?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(['MERCADOPAGO', 'DLOCAL_GO', 'SIMULATION'])
  paymentProvider: 'MERCADOPAGO' | 'DLOCAL_GO' | 'SIMULATION';

  @IsString()
  @IsOptional()
  couponCode?: string;
}
