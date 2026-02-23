import { IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StockEntryDto {
  @IsString()
  posId: string;

  @IsNumber()
  stock: number;
}

export class SyncStockDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockEntryDto)
  entries: StockEntryDto[];
}
