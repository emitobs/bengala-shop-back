import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalProducts,
      activeProducts,
      totalOrders,
      todayOrders,
      monthRevenue,
      todayRevenue,
      totalUsers,
      recentOrders,
      lowStockVariants,
      ordersByStatus,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.order.aggregate({
        where: { status: 'PAID', createdAt: { gte: startOfMonth } },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { status: 'PAID', createdAt: { gte: startOfToday } },
        _sum: { total: true },
      }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.productVariant.findMany({
        where: { stock: { lte: 5 }, isActive: true },
        include: { product: { select: { name: true, sku: true } } },
        take: 10,
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    return {
      stats: {
        totalProducts,
        activeProducts,
        totalOrders,
        todayOrders,
        monthRevenue: Number(monthRevenue._sum.total || 0),
        todayRevenue: Number(todayRevenue._sum.total || 0),
        totalUsers,
      },
      recentOrders,
      lowStockVariants,
      ordersByStatus: ordersByStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
    };
  }
}
