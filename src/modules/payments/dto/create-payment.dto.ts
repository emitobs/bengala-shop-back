import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsEnum(['MERCADOPAGO', 'DLOCAL_GO', 'SIMULATION'])
  provider: 'MERCADOPAGO' | 'DLOCAL_GO' | 'SIMULATION';
}
