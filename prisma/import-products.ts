/**
 * Import products from billing system (SQL Server .bak export)
 *
 * Run with:  npx tsx prisma/import-products.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Types for the imported data
// ---------------------------------------------------------------------------

interface RawFamilia {
  id: string;
  name: string;
  padre: string;
  nivel: number;
}

interface RawArticulo {
  sku: string;
  name: string;
  familiaId: string;
  barcode: string;
  brand: string;
  model: string;
  stock: number;
  price: number;
  costPrice: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert "ALL CAPS TEXT" to "All Caps Text" */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s|[-/.(])\S/g, (match) => match.toUpperCase())
    .trim();
}

/** Generate a URL-safe slug from a string */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

/** Make a slug unique by appending a suffix */
function uniqueSlug(base: string, suffix: string): string {
  const slug = slugify(base);
  return `${slug}-${suffix}`.substring(0, 100);
}

/** Round to 2 decimal places */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Main import
// ---------------------------------------------------------------------------

async function main() {
  const dataDir = path.join(__dirname, 'import-data');

  console.log('Loading exported data...');
  const familias: RawFamilia[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'familias.json'), 'utf-8'),
  );
  const articulos: RawArticulo[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'articulos.json'), 'utf-8'),
  );
  console.log(`  ${familias.length} families, ${articulos.length} products loaded`);

  // ── Step 1: Clean existing product data ─────────────────────
  console.log('\nCleaning existing product data...');
  await prisma.$transaction([
    prisma.cartItem.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.review.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.productCategory.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
  ]);
  console.log('  Existing products and categories cleared');

  // ── Step 2: Import categories from families ──────────────────
  console.log('\nImporting categories...');

  // Build parent mapping
  // nivel 0 and padre "" or "Familias" → root category
  // nivel 2 and padre is a numeric ID → child of that familia
  const familiaMap = new Map<string, string>(); // old familia ID → new category ID
  const categorySlugSet = new Set<string>();

  // Import root categories first (nivel 0 and nivel 1 with padre "Familias")
  const rootFamilias = familias.filter(
    (f) => f.nivel === 0 || f.padre === 'Familias',
  );

  for (const f of rootFamilias) {
    const name = toTitleCase(f.name.trim());
    let slug = slugify(name);
    if (categorySlugSet.has(slug)) slug = `${slug}-${f.id}`;
    categorySlugSet.add(slug);

    const cat = await prisma.category.create({
      data: {
        name,
        slug,
        isActive: true,
        sortOrder: parseInt(f.id),
      },
    });
    familiaMap.set(f.id, cat.id);
    console.log(`  [root] ${name} (${slug})`);
  }

  // Import child categories (nivel 2 with numeric padre)
  const childFamilias = familias.filter(
    (f) => f.nivel === 2 && f.padre && f.padre !== 'Familias',
  );

  for (const f of childFamilias) {
    const parentCategoryId = familiaMap.get(f.padre);
    const name = toTitleCase(f.name.trim());
    let slug = slugify(name);
    if (categorySlugSet.has(slug)) slug = `${slug}-${f.id}`;
    categorySlugSet.add(slug);

    const cat = await prisma.category.create({
      data: {
        name,
        slug,
        parentId: parentCategoryId || null,
        isActive: true,
        sortOrder: parseInt(f.id),
      },
    });
    familiaMap.set(f.id, cat.id);
    console.log(`  [child] ${name} → parent ${f.padre}`);
  }

  // Create a fallback "Sin Categoría" for products without a family
  const fallbackCat = await prisma.category.create({
    data: {
      name: 'Sin Categoria',
      slug: 'sin-categoria',
      isActive: true,
      sortOrder: 999,
    },
  });
  console.log(`  [fallback] Sin Categoria`);

  console.log(`  Total categories: ${familiaMap.size + 1}`);

  // ── Step 3: Import products in batches ───────────────────────
  console.log(`\nImporting ${articulos.length} products...`);

  const BATCH_SIZE = 500;
  const slugSet = new Set<string>();
  const skuSet = new Set<string>();
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < articulos.length; i += BATCH_SIZE) {
    const batch = articulos.slice(i, i + BATCH_SIZE);

    for (const art of batch) {
      // Skip products with empty names
      if (!art.name || art.name.trim().length === 0) {
        skipped++;
        continue;
      }

      // Ensure unique SKU
      let sku = art.sku.trim();
      if (!sku || skuSet.has(sku)) {
        skipped++;
        continue;
      }
      skuSet.add(sku);

      // Build product name (Title Case)
      const name = toTitleCase(art.name.trim());

      // Generate unique slug
      let slug = slugify(name);
      if (slugSet.has(slug)) {
        slug = uniqueSlug(name, sku.slice(-6));
      }
      if (slugSet.has(slug)) {
        slug = `${slug}-${imported}`;
      }
      slugSet.add(slug);

      // Build description from available data
      const descParts: string[] = [];
      if (art.brand && art.brand.trim()) descParts.push(`Marca: ${toTitleCase(art.brand.trim())}`);
      if (art.model && art.model.trim()) descParts.push(`Modelo: ${toTitleCase(art.model.trim())}`);
      if (art.barcode && art.barcode.trim()) descParts.push(`Codigo de barras: ${art.barcode.trim()}`);
      if (art.notes && art.notes.trim()) descParts.push(art.notes.trim());
      const description = descParts.length > 0 ? descParts.join('\n\n') : name;

      const price = round2(art.price);
      const costPrice = art.costPrice > 0 ? round2(art.costPrice) : null;
      const stock = Math.max(0, art.stock);

      // Determine category
      const categoryId = art.familiaId
        ? familiaMap.get(art.familiaId) || fallbackCat.id
        : fallbackCat.id;

      try {
        await prisma.product.create({
          data: {
            name,
            slug,
            sku,
            description,
            basePrice: price,
            costPrice,
            isActive: true,
            isFeatured: false,
            categories: {
              create: { categoryId },
            },
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
        imported++;
      } catch (err: any) {
        // Skip duplicates or constraint errors
        if (err.code === 'P2002') {
          skipped++;
        } else {
          console.error(`  Error on "${name}" (${sku}):`, err.message);
          skipped++;
        }
      }
    }

    const pct = Math.round(((i + batch.length) / articulos.length) * 100);
    process.stdout.write(`\r  Progress: ${imported} imported, ${skipped} skipped (${pct}%)`);
  }

  console.log(`\n\n  Import complete: ${imported} products imported, ${skipped} skipped`);

  // ── Step 4: Print summary ────────────────────────────────────
  const totalProducts = await prisma.product.count();
  const totalCategories = await prisma.category.count();
  console.log(`\nFinal counts:`);
  console.log(`  Products: ${totalProducts}`);
  console.log(`  Categories: ${totalCategories}`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
