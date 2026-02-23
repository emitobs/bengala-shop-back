import { Controller, Get, Param, Post } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.favoritesService.findAll(userId);
  }

  @Post(':productId')
  toggle(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.favoritesService.toggle(userId, productId);
  }
}
