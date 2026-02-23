import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  createFromCart(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createFromCart(userId, dto);
  }

  @Get()
  findAllByUser(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.findAllByUser(
      userId,
      page ? +page : 1,
      limit ? +limit : 10,
    );
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE')
  @Get('admin/list')
  findAllAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAllAdmin(
      page ? +page : 1,
      limit ? +limit : 20,
      status,
    );
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE')
  @Get('admin/:id')
  findByIdAdmin(@Param('id') id: string) {
    return this.ordersService.findByIdAdmin(id);
  }

  @Get(':id')
  findById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.findById(userId, id);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('id') changedBy: string,
  ) {
    return this.ordersService.updateStatus(id, dto, changedBy);
  }
}
