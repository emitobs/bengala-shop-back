import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SyncArticuloDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  familiaId?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsNumber()
  stock: number;

  @IsNumber()
  price: number;

  @IsNumber()
  costPrice: number;

  @IsBoolean()
  inactive: boolean;
}

export class SyncProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncArticuloDto)
  products: SyncArticuloDto[];
}
