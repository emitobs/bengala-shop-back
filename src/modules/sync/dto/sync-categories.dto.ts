import { IsString, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncFamiliaDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  padre: string;

  @IsInt()
  nivel: number;
}

export class SyncCategoriesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncFamiliaDto)
  familias: SyncFamiliaDto[];
}
