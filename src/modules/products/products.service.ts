import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { AddProductImageDto } from './dto/add-product-image.dto';
import { generateSlug } from '../../common/utils/slug.util';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) { }

  async findAll(query: ProductQueryDto) {
    const { page = 1, limit = 20, search, categorySlug, minPrice, maxPrice, isFeatured, hasDiscount, sortBy } = query;
    const skip = (page - 1) * limit;

    const settings = await this.settingsService.getSettings();

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (settings.hideOutOfStock) {
      where.variants = {
        some: { stock: { gt: 0 }, isActive: true },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categorySlug) {
      where.categories = {
        some: {
          category: { slug: categorySlug },
        },
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {};
      if (minPrice !== undefined) where.basePrice.gte = minPrice;
      if (maxPrice !== undefined) where.basePrice.lte = maxPrice;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (hasDiscount) {
      where.compareAtPrice = { not: null };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    switch (sortBy) {
      case 'price_asc':
        orderBy = { basePrice: 'asc' };
        break;
      case 'price_desc':
        orderBy = { basePrice: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'name_desc':
        orderBy = { name: 'desc' };
        break;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
          variants: { where: { isActive: true }, select: { id: true, stock: true } },
          _count: { select: { reviews: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: products.map((p) => ({
        ...p,
        categories: p.categories.map((pc) => pc.category),
        totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
        reviewCount: p._count.reviews,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        categories: { include: { category: true } },
        variants: { where: { isActive: true }, orderBy: { type: 'asc' } },
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { reviews: { where: { isApproved: true } } } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Calculate average rating
    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0;

    return {
      ...product,
      categories: product.categories.map((pc) => pc.category),
      averageRating: Math.round(avgRating * 10) / 10,
      reviewCount: product._count.reviews,
    };
  }

  async findFeatured(limit = 8) {
    const settings = await this.settingsService.getSettings();

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      isFeatured: true,
    };

    if (settings.hideOutOfStock) {
      where.variants = {
        some: { stock: { gt: 0 }, isActive: true },
      };
    }

    const products = await this.prisma.product.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        variants: { where: { isActive: true }, select: { id: true, stock: true } },
        _count: { select: { reviews: true } },
      },
    });

    return products.map((p) => ({
      ...p,
      totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
      reviewCount: p._count.reviews,
    }));
  }

  // === Admin methods ===

  async create(dto: CreateProductDto) {
    const slug = generateSlug(dto.name);

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        sku: dto.sku,
        basePrice: dto.basePrice,
        compareAtPrice: dto.compareAtPrice,
        costPrice: dto.costPrice,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        weight: dto.weight,
        dimensions: dto.dimensions ?? undefined,
        categories: dto.categoryIds?.length
          ? { create: dto.categoryIds.map((id) => ({ categoryId: id })) }
          : undefined,
        variants: dto.variants?.length
          ? {
            create: dto.variants.map((v) => ({
              name: v.name,
              sku: v.sku,
              type: v.type as any,
              value: v.value,
              priceAdjustment: v.priceAdjustment ?? 0,
              stock: v.stock,
              lowStockThreshold: v.lowStockThreshold ?? 5,
            })),
          }
          : undefined,
      },
      include: {
        categories: { include: { category: true } },
        variants: true,
        images: true,
      },
    });

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    const slug = dto.name ? generateSlug(dto.name) : undefined;

    // Update category associations if provided
    if (dto.categoryIds) {
      await this.prisma.productCategory.deleteMany({ where: { productId: id } });
      await this.prisma.productCategory.createMany({
        data: dto.categoryIds.map((categoryId) => ({ productId: id, categoryId })),
      });
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        sku: dto.sku,
        basePrice: dto.basePrice,
        compareAtPrice: dto.compareAtPrice,
        costPrice: dto.costPrice,
        isActive: dto.isActive,
        isFeatured: dto.isFeatured,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        weight: dto.weight,
        dimensions: dto.dimensions ?? undefined,
      },
      include: {
        categories: { include: { category: true } },
        variants: true,
        images: true,
      },
    });

    return product;
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }

  async findAllAdmin(query: ProductQueryDto) {
    const { page = 1, limit = 20, search, categorySlug, sortBy, isActive, stockFilter } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categorySlug) {
      where.categories = {
        some: { category: { slug: categorySlug } },
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (stockFilter === 'in_stock') {
      where.variants = { some: { stock: { gt: 0 } } };
    } else if (stockFilter === 'out_of_stock') {
      where.NOT = { variants: { some: { stock: { gt: 0 } } } };
    } else if (stockFilter === 'low_stock') {
      where.variants = { some: { stock: { lte: 5 }, isActive: true } };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    switch (sortBy) {
      case 'price_asc':
        orderBy = { basePrice: 'asc' };
        break;
      case 'price_desc':
        orderBy = { basePrice: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'name_desc':
        orderBy = { name: 'desc' };
        break;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          categories: { include: { category: { select: { name: true } } } },
          variants: { select: { stock: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: products.map((p) => ({
        ...p,
        categories: p.categories.map((pc) => pc.category),
        totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
      })),
      meta: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  // --- Product Image Management ---

  async findBySku(sku: string) {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
        variants: { where: { isActive: true } },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with SKU "${sku}" not found`);
    }

    return {
      ...product,
      categories: product.categories.map((pc) => pc.category),
    };
  }

  async addImage(productId: string, dto: AddProductImageDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    // If this image is primary, unset other primary images
    if (dto.isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Auto-set sortOrder if not provided
    if (dto.sortOrder === undefined) {
      const maxSort = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      dto.sortOrder = (maxSort?.sortOrder ?? -1) + 1;
    }

    // If it's the first image, make it primary automatically
    const imageCount = await this.prisma.productImage.count({ where: { productId } });
    const isPrimary = dto.isPrimary ?? (imageCount === 0);

    const image = await this.prisma.productImage.create({
      data: {
        productId,
        url: dto.url,
        altText: dto.altText ?? product.name,
        sortOrder: dto.sortOrder,
        isPrimary,
      },
    });

    return image;
  }

  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Image not found');

    await this.prisma.productImage.delete({ where: { id: imageId } });

    // If the deleted image was primary, set the first remaining image as primary
    if (image.isPrimary) {
      const firstImage = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
      if (firstImage) {
        await this.prisma.productImage.update({
          where: { id: firstImage.id },
          data: { isPrimary: true },
        });
      }
    }

    return { message: 'Image removed' };
  }

  async updateImage(productId: string, imageId: string, dto: Partial<AddProductImageDto>) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Image not found');

    if (dto.isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.productImage.update({
      where: { id: imageId },
      data: {
        url: dto.url,
        altText: dto.altText,
        sortOrder: dto.sortOrder,
        isPrimary: dto.isPrimary,
      },
    });
  }
}
