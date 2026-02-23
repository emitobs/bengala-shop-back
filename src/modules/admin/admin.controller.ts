import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }
}
