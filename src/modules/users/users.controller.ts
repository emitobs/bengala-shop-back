import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: { id: string }) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() data: { firstName?: string; lastName?: string; phone?: string },
  ) {
    return this.usersService.updateProfile(user.id, data);
  }

  @Get('me/addresses')
  getAddresses(@CurrentUser() user: { id: string }) {
    return this.usersService.getAddresses(user.id);
  }

  @Post('me/addresses')
  createAddress(@CurrentUser() user: { id: string }, @Body() data: CreateAddressDto) {
    return this.usersService.createAddress(user.id, data);
  }

  @Patch('me/addresses/:id')
  updateAddress(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() data: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, id, data);
  }

  @Delete('me/addresses/:id')
  deleteAddress(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.usersService.deleteAddress(user.id, id);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/list')
  findAllAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.findAllAdmin(
      page ? +page : 1,
      limit ? +limit : 20,
      search,
      role,
      isActive !== undefined ? isActive === 'true' : undefined,
    );
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('admin')
  adminCreateUser(
    @CurrentUser() actor: { role: string },
    @Body() dto: AdminCreateUserDto,
  ) {
    return this.usersService.adminCreateUser(dto, actor.role);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('admin/:id')
  adminUpdateUser(
    @CurrentUser() actor: { role: string },
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdateUser(id, dto, actor.role);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('admin/:id/reset-password')
  adminResetPassword(
    @CurrentUser() actor: { role: string },
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    return this.usersService.adminResetPassword(id, dto.password, actor.role);
  }
}
