import { IsNotEmpty, IsString } from 'class-validator';

export class CalculateShippingDto {
  @IsString()
  @IsNotEmpty()
  department: string;
}
