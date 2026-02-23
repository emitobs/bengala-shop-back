import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            variants: {
              where: { isActive: true },
              select: { id: true, stock: true },
            },
          },
        },
      },
    });

    return {
      data: favorites.map((fav) => ({
        id: fav.id,
        createdAt: fav.createdAt,
        product: {
          ...fav.product,
          totalStock: fav.product.variants.reduce(
            (sum, v) => sum + v.stock,
            0,
          ),
        },
      })),
    };
  }

  async toggle(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });
      return { isFavorite: false };
    }

    await this.prisma.favorite.create({
      data: { userId, productId },
    });

    return { isFavorite: true };
  }

  async isFavorite(userId: string, productId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    return { isFavorite: !!favorite };
  }
}
