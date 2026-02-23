import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';

@Injectable()
export class ShippingService {
  constructor(private prisma: PrismaService) {}

  async calculateShipping(department: string, subtotal: number) {
    const zone = await this.prisma.shippingZone.findFirst({
      where: {
        isActive: true,
        departments: { has: department },
      },
    });

    if (!zone) {
      throw new NotFoundException(
        `No shipping zone found for department: ${department}`,
      );
    }

    const baseCost = Number(zone.baseCost);
    const freeAbove = zone.freeAbove ? Number(zone.freeAbove) : null;

    const cost =
      freeAbove !== null && subtotal >= freeAbove ? 0 : baseCost;

    return {
      cost,
      estimatedDays: zone.estimatedDays,
      zoneName: zone.name,
    };
  }

  async findAllZones() {
    const zones = await this.prisma.shippingZone.findMany({
      orderBy: { name: 'asc' },
    });

    return { data: zones };
  }

  async createZone(dto: CreateShippingZoneDto) {
    const zone = await this.prisma.shippingZone.create({
      data: {
        name: dto.name,
        departments: dto.departments,
        baseCost: dto.baseCost,
        freeAbove: dto.freeAbove ?? null,
        estimatedDays: dto.estimatedDays,
      },
    });

    return zone;
  }

  async updateZone(id: string, dto: UpdateShippingZoneDto) {
    const existing = await this.prisma.shippingZone.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Shipping zone not found');
    }

    const zone = await this.prisma.shippingZone.update({
      where: { id },
      data: {
        name: dto.name,
        departments: dto.departments,
        baseCost: dto.baseCost,
        freeAbove: dto.freeAbove,
        estimatedDays: dto.estimatedDays,
        isActive: dto.isActive,
      },
    });

    return zone;
  }

  async removeZone(id: string) {
    const existing = await this.prisma.shippingZone.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Shipping zone not found');
    }

    await this.prisma.shippingZone.delete({ where: { id } });
    return { message: 'Shipping zone deleted' };
  }
}
