import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generateSlug } from '../../common/utils/slug.util';
import { SyncFamiliaDto } from './dto/sync-categories.dto';
import { SyncArticuloDto } from './dto/sync-products.dto';
import { StockEntryDto } from './dto/sync-stock.dto';

/** Convert "ALL CAPS TEXT" to "All Caps Text" */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s|[-/.(])\S/g, (match) => match.toUpperCase())
    .trim();
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Categories ──────────────────────────────────────────────

  async syncCategories(branchId: string, familias: SyncFamiliaDto[]) {
    const start = Date.now();
    let created = 0;
    let updated = 0;

    // Process root categories first (nivel 0 and nivel 1 with padre "Familias" or empty)
    const roots = familias.filter(
      (f) => f.nivel === 0 || f.padre === 'Familias' || f.padre === '',
    );
    const children = familias.filter(
      (f) => f.nivel === 2 && f.padre && f.padre !== 'Familias',
    );

    for (const f of roots) {
      const result = await this.upsertCategory(f.id, f.name, null);
      if (result === 'created') created++;
      else updated++;
    }

    for (const f of children) {
      const parentCat = await this.prisma.category.findUnique({
        where: { posId: f.padre },
      });
      const result = await this.upsertCategory(
        f.id,
        f.name,
        parentCat?.id || null,
      );
      if (result === 'created') created++;
      else updated++;
    }

    const duration = Date.now() - start;
    await this.logSync(branchId, 'categories', 'success', created + updated, duration);

    return { created, updated, duration };
  }

  private async upsertCategory(
    posId: string,
    rawName: string,
    parentId: string | null,
  ): Promise<'created' | 'updated'> {
    const name = toTitleCase(rawName.trim());
    const existing = await this.prisma.category.findUnique({
      where: { posId },
    });

    if (existing) {
      await this.prisma.category.update({
        where: { id: existing.id },
        data: { name, parentId },
      });
      return 'updated';
    }

    // Generate unique slug
    let slug = generateSlug(name);
    const slugExists = await this.prisma.category.findUnique({
      where: { slug },
    });
    if (slugExists) slug = `${slug}-${posId}`;

    await this.prisma.category.create({
      data: { posId, name, slug, parentId, isActive: true },
    });
    return 'created';
  }

  // ─── Products ────────────────────────────────────────────────

  async syncProducts(branchId: string, products: SyncArticuloDto[]) {
    const start = Date.now();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const art of products) {
      if (!art.name || art.name.trim().length === 0) {
        skipped++;
        continue;
      }

      try {
        const result = await this.upsertProduct(art);
        if (result === 'created') created++;
        else if (result === 'updated') updated++;
        else skipped++;
      } catch (err: any) {
        if (err.code === 'P2002') {
          skipped++;
        } else {
          this.logger.error(`Error syncing product ${art.id}: ${err.message}`);
          skipped++;
        }
      }
    }

    const duration = Date.now() - start;
    await this.logSync(branchId, 'products', 'success', created + updated, duration);

    return { created, updated, skipped, duration };
  }

  private async upsertProduct(
    art: SyncArticuloDto,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const existing = await this.prisma.product.findUnique({
      where: { posId: art.id },
    });

    // Resolve category
    let categoryId: string | null = null;
    if (art.familiaId) {
      const cat = await this.prisma.category.findUnique({
        where: { posId: art.familiaId },
      });
      categoryId = cat?.id || null;
    }

    const price = Math.round(art.price * 100) / 100;
    const costPrice = art.costPrice > 0 ? Math.round(art.costPrice * 100) / 100 : null;

    if (existing) {
      // Update — only sync-relevant fields (don't overwrite admin edits)
      await this.prisma.product.update({
        where: { id: existing.id },
        data: {
          name: toTitleCase(art.name.trim()),
          basePrice: price,
          costPrice,
          isActive: !art.inactive,
        },
      });

      // Update category association if changed
      if (categoryId) {
        const currentCats = await this.prisma.productCategory.findMany({
          where: { productId: existing.id },
        });

        if (currentCats.length === 0 || (currentCats.length === 1 && currentCats[0].categoryId !== categoryId)) {
          await this.prisma.productCategory.deleteMany({
            where: { productId: existing.id },
          });
          await this.prisma.productCategory.create({
            data: { productId: existing.id, categoryId },
          });
        }
      }

      return 'updated';
    }

    // Create new product
    const name = toTitleCase(art.name.trim());
    const sku = art.id.trim();

    // Ensure unique SKU
    const skuExists = await this.prisma.product.findUnique({ where: { sku } });
    if (skuExists) return 'skipped';

    // Generate unique slug
    let slug = generateSlug(name);
    const slugExists = await this.prisma.product.findUnique({ where: { slug } });
    if (slugExists) slug = `${slug}-${sku.slice(-6)}`;
    const slugExists2 = await this.prisma.product.findUnique({ where: { slug } });
    if (slugExists2) slug = `${slug}-${Date.now()}`;

    // Build description from available data
    const descParts: string[] = [];
    if (art.brand?.trim()) descParts.push(`Marca: ${toTitleCase(art.brand.trim())}`);
    if (art.model?.trim()) descParts.push(`Modelo: ${toTitleCase(art.model.trim())}`);
    if (art.barcode?.trim()) descParts.push(`Codigo de barras: ${art.barcode.trim()}`);
    const description = descParts.length > 0 ? descParts.join('\n\n') : name;

    const stock = Math.max(0, Math.round(art.stock));

    await this.prisma.product.create({
      data: {
        posId: art.id,
        name,
        slug,
        sku,
        description,
        basePrice: price,
        costPrice,
        isActive: !art.inactive,
        categories: categoryId
          ? { create: { categoryId } }
          : undefined,
        variants: {
          create: {
            name: 'Unico',
            sku: `${sku}-U`,
            type: 'OTHER',
            value: 'default',
            priceAdjustment: 0,
            stock,
            isActive: true,
          },
        },
      },
    });

    return 'created';
  }

  // ─── Stock ───────────────────────────────────────────────────

  async syncStock(branchId: string, entries: StockEntryDto[]) {
    const start = Date.now();
    let synced = 0;
    let skipped = 0;

    // Batch: resolve posId → productId
    const posIds = entries.map((e) => e.posId);
    const products = await this.prisma.product.findMany({
      where: { posId: { in: posIds } },
      select: { id: true, posId: true },
    });
    const posIdToProductId = new Map(
      products.map((p) => [p.posId!, p.id]),
    );

    // Upsert BranchStock entries
    for (const entry of entries) {
      const productId = posIdToProductId.get(entry.posId);
      if (!productId) {
        skipped++;
        continue;
      }

      const stock = Math.max(0, Math.round(entry.stock));

      await this.prisma.branchStock.upsert({
        where: {
          branchId_productId: { branchId, productId },
        },
        update: { stock },
        create: { branchId, productId, stock },
      });
      synced++;
    }

    // Recalculate total stock for affected products
    const affectedProductIds = entries
      .map((e) => posIdToProductId.get(e.posId))
      .filter((id): id is string => !!id);

    if (affectedProductIds.length > 0) {
      await this.recalculateStock(affectedProductIds);
    }

    const duration = Date.now() - start;
    await this.logSync(branchId, 'stock', 'success', synced, duration);

    // Update branch lastSyncAt
    await this.prisma.branch.update({
      where: { id: branchId },
      data: { lastSyncAt: new Date() },
    });

    return { synced, skipped, duration };
  }

  /**
   * Recalculate total stock from all branches and update the default variant.
   * Only updates variants with value='default' (POS-synced products).
   */
  private async recalculateStock(productIds: string[]) {
    for (const productId of productIds) {
      // Sum stock across all branches
      const result = await this.prisma.branchStock.aggregate({
        where: { productId },
        _sum: { stock: true },
      });
      const totalStock = result._sum.stock || 0;

      // Update the "default" variant (created by sync)
      await this.prisma.productVariant.updateMany({
        where: {
          productId,
          value: 'default',
        },
        data: { stock: totalStock },
      });
    }
  }

  // ─── Known POS IDs ──────────────────────────────────────────

  async getKnownPosIds(): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      where: { posId: { not: null } },
      select: { posId: true },
    });
    return products.map((p) => p.posId!);
  }

  // ─── Status ─────────────────────────────────────────────────

  async getStatus(branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { lastSyncAt: true, name: true, code: true },
    });

    const recentLogs = await this.prisma.syncLog.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return { branch, recentLogs };
  }

  // ─── Sync Log ───────────────────────────────────────────────

  private async logSync(
    branchId: string,
    type: string,
    status: string,
    itemCount: number,
    duration: number,
    error?: string,
  ) {
    await this.prisma.syncLog.create({
      data: { branchId, type, status, itemCount, duration, error },
    });
  }

  async logError(branchId: string, type: string, error: string, duration: number) {
    await this.logSync(branchId, type, 'error', 0, duration, error);
  }
}
