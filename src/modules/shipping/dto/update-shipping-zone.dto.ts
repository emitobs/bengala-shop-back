import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateShippingZoneDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  departments?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  baseCost?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  freeAbove?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  estimatedDays?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
