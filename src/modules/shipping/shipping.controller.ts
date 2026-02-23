import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { CalculateShippingDto } from './dto/calculate-shipping.dto';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('shipping')
export class ShippingController {
  constructor(private shippingService: ShippingService) {}

  @Public()
  @Post('calculate')
  calculateShipping(@Body() dto: CalculateShippingDto) {
    return this.shippingService.calculateShipping(dto.department, 0);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('zones')
  findAllZones() {
    return this.shippingService.findAllZones();
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('zones')
  createZone(@Body() dto: CreateShippingZoneDto) {
    return this.shippingService.createZone(dto);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('zones/:id')
  updateZone(
    @Param('id') id: string,
    @Body() dto: UpdateShippingZoneDto,
  ) {
    return this.shippingService.updateZone(id, dto);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete('zones/:id')
  removeZone(@Param('id') id: string) {
    return this.shippingService.removeZone(id);
  }
}
