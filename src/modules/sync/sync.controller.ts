import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiKeyAuth, CurrentBranch } from '../../common/decorators/api-key.decorator';
import { SyncService } from './sync.service';
import { SyncCategoriesDto } from './dto/sync-categories.dto';
import { SyncProductsDto } from './dto/sync-products.dto';
import { SyncStockDto } from './dto/sync-stock.dto';

@Controller('sync')
@ApiKeyAuth()
@SkipThrottle()
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('categories')
  @HttpCode(HttpStatus.OK)
  async syncCategories(
    @CurrentBranch('id') branchId: string,
    @Body() dto: SyncCategoriesDto,
  ) {
    return this.syncService.syncCategories(branchId, dto.familias);
  }

  @Post('products')
  @HttpCode(HttpStatus.OK)
  async syncProducts(
    @CurrentBranch('id') branchId: string,
    @Body() dto: SyncProductsDto,
  ) {
    return this.syncService.syncProducts(branchId, dto.products);
  }

  @Post('stock')
  @HttpCode(HttpStatus.OK)
  async syncStock(
    @CurrentBranch('id') branchId: string,
    @Body() dto: SyncStockDto,
  ) {
    return this.syncService.syncStock(branchId, dto.entries);
  }

  @Get('known-pos-ids')
  async getKnownPosIds() {
    return this.syncService.getKnownPosIds();
  }

  @Get('status')
  async getStatus(@CurrentBranch('id') branchId: string) {
    return this.syncService.getStatus(branchId);
  }
}
