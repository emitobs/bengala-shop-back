import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin')
@Roles('SUPER_ADMIN')
export class BranchesController {
  constructor(private prisma: PrismaService) {}

  @Get('branches')
  async list() {
    return this.prisma.branch.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        location: true,
        apiKey: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });
  }

  @Post('branches')
  async create(
    @Body() dto: { name: string; code: string; location: string },
  ) {
    return this.prisma.branch.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        location: dto.location,
        apiKey: randomUUID(),
      },
    });
  }

  @Patch('branches/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: { name?: string; code?: string; location?: string; isActive?: boolean },
  ) {
    const data: Record<string, any> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.code !== undefined) data.code = dto.code.toUpperCase();
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.branch.update({ where: { id }, data });
  }

  @Delete('branches/:id')
  async deactivate(@Param('id') id: string) {
    return this.prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });
  }

  @Post('branches/:id/regenerate-key')
  async regenerateKey(@Param('id') id: string) {
    return this.prisma.branch.update({
      where: { id },
      data: { apiKey: randomUUID() },
    });
  }

  @Get('sync-logs')
  async logs(
    @Query('branchId') branchId?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    const where: Record<string, any> = {};
    if (branchId) where.branchId = branchId;
    if (type) where.type = type;

    return this.prisma.syncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit || '50'),
      include: {
        branch: { select: { name: true, code: true } },
      },
    });
  }
}
