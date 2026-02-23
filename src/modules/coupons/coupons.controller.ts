import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('coupons')
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @Post('validate')
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get()
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.couponsService.findAll(page, limit);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/toggle')
  toggleActive(@Param('id') id: string) {
    return this.couponsService.toggleActive(id);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.couponsService.delete(id);
  }
}
