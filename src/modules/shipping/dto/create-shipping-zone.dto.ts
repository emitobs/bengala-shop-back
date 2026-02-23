import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateShippingZoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsString({ each: true })
  departments: string[];

  @IsNumber()
  @Min(0)
  baseCost: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  freeAbove?: number;

  @IsInt()
  @Min(1)
  estimatedDays: number;
}
