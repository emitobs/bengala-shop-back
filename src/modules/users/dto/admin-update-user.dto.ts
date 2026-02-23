import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class AdminUpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsEnum(['CUSTOMER', 'ADMIN', 'WAREHOUSE', 'SUPER_ADMIN'])
  @IsOptional()
  role?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
