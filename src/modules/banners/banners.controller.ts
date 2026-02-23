import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('banners')
export class BannersController {
  constructor(private bannersService: BannersService) {}

  @Public()
  @Get()
  findActive() {
    return this.bannersService.findActive();
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/list')
  findAll() {
    return this.bannersService.findAll();
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('admin')
  create(@Body() dto: CreateBannerDto) {
    return this.bannersService.create(dto);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('admin/:id')
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.update(id, dto);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete('admin/:id')
  remove(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }
}
