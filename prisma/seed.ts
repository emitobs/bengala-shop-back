import { PrismaClient, UserRole, AuthProvider, VariantType } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ============================================================
  // ADMIN USER
  // ============================================================
  const adminPassword = await hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bengalamax.uy' },
    update: {},
    create: {
      email: 'admin@bengalamax.uy',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'Bengala',
      role: UserRole.SUPER_ADMIN,
      authProvider: AuthProvider.LOCAL,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log(`  Admin user created: ${admin.email}`);

  // ============================================================
  // CATEGORIES
  // ============================================================
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'hogar' },
      update: {},
      create: {
        name: 'Hogar',
        slug: 'hogar',
        description: 'Artículos para el hogar',
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'tecnologia' },
      update: {},
      create: {
        name: 'Tecnología',
        slug: 'tecnologia',
        description: 'Electrónica y gadgets',
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'ropa-y-accesorios' },
      update: {},
      create: {
        name: 'Ropa y Accesorios',
        slug: 'ropa-y-accesorios',
        description: 'Moda y complementos',
        sortOrder: 3,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'juguetes' },
      update: {},
      create: {
        name: 'Juguetes',
        slug: 'juguetes',
        description: 'Juguetes y entretenimiento',
        sortOrder: 4,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'belleza-y-cuidado' },
      update: {},
      create: {
        name: 'Belleza y Cuidado',
        slug: 'belleza-y-cuidado',
        description: 'Productos de belleza y cuidado personal',
        sortOrder: 5,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'deportes' },
      update: {},
      create: {
        name: 'Deportes',
        slug: 'deportes',
        description: 'Artículos deportivos',
        sortOrder: 6,
        isActive: true,
      },
    }),
  ]);
  console.log(`  ${categories.length} categories created`);

  // Subcategories
  const subcategories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'cocina' },
      update: {},
      create: {
        name: 'Cocina',
        slug: 'cocina',
        description: 'Utensilios y accesorios de cocina',
        parentId: categories[0].id,
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'decoracion' },
      update: {},
      create: {
        name: 'Decoración',
        slug: 'decoracion',
        description: 'Artículos de decoración',
        parentId: categories[0].id,
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'celulares-y-accesorios' },
      update: {},
      create: {
        name: 'Celulares y Accesorios',
        slug: 'celulares-y-accesorios',
        description: 'Fundas, cargadores y más',
        parentId: categories[1].id,
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'audio' },
      update: {},
      create: {
        name: 'Audio',
        slug: 'audio',
        description: 'Auriculares, parlantes y más',
        parentId: categories[1].id,
        sortOrder: 2,
        isActive: true,
      },
    }),
  ]);
  console.log(`  ${subcategories.length} subcategories created`);

  // ============================================================
  // PRODUCTS
  // ============================================================
  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: 'auriculares-bluetooth-pro' },
      update: {},
      create: {
        name: 'Auriculares Bluetooth Pro',
        slug: 'auriculares-bluetooth-pro',
        description: 'Auriculares inalámbricos con cancelación de ruido activa. Batería de larga duración, hasta 30 horas. Conexión Bluetooth 5.3 estable y rápida.',
        shortDescription: 'Auriculares inalámbricos con cancelación de ruido',
        sku: 'BM-AUD-001',
        basePrice: 2490,
        compareAtPrice: 3200,
        isFeatured: true,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'termo-acero-inoxidable-1l' },
      update: {},
      create: {
        name: 'Termo Acero Inoxidable 1L',
        slug: 'termo-acero-inoxidable-1l',
        description: 'Termo de acero inoxidable de 1 litro. Mantiene la temperatura por 24 horas. Ideal para mate, café o té. Tapa a rosca hermética.',
        shortDescription: 'Termo premium para mate',
        sku: 'BM-HOG-001',
        basePrice: 1890,
        compareAtPrice: 2200,
        isFeatured: true,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'mochila-urbana-resistente' },
      update: {},
      create: {
        name: 'Mochila Urbana Resistente',
        slug: 'mochila-urbana-resistente',
        description: 'Mochila urbana con compartimento para notebook de hasta 15.6 pulgadas. Material resistente al agua. Múltiples bolsillos organizadores.',
        shortDescription: 'Mochila con compartimento para notebook',
        sku: 'BM-ACC-001',
        basePrice: 2190,
        isFeatured: true,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'parlante-portatil-waterproof' },
      update: {},
      create: {
        name: 'Parlante Portátil Waterproof',
        slug: 'parlante-portatil-waterproof',
        description: 'Parlante Bluetooth resistente al agua IPX7. Sonido potente de 20W. Batería de 12 horas. Ideal para playa, piscina y actividades al aire libre.',
        shortDescription: 'Parlante Bluetooth resistente al agua',
        sku: 'BM-AUD-002',
        basePrice: 1790,
        compareAtPrice: 2100,
        isFeatured: true,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'set-organizadores-hogar' },
      update: {},
      create: {
        name: 'Set Organizadores para Hogar',
        slug: 'set-organizadores-hogar',
        description: 'Set de 5 organizadores de tela plegables. Perfectos para armarios, cajones y estanterías. Diseño moderno y funcional.',
        shortDescription: 'Set de 5 organizadores plegables',
        sku: 'BM-HOG-002',
        basePrice: 990,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'reloj-smartwatch-deportivo' },
      update: {},
      create: {
        name: 'Reloj Smartwatch Deportivo',
        slug: 'reloj-smartwatch-deportivo',
        description: 'Smartwatch con monitor de frecuencia cardíaca, GPS integrado, resistente al agua IP68. Compatible con Android e iOS. Múltiples modos deportivos.',
        shortDescription: 'Smartwatch con GPS y monitor cardíaco',
        sku: 'BM-TEC-001',
        basePrice: 3490,
        compareAtPrice: 4200,
        isFeatured: true,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'lampara-led-escritorio' },
      update: {},
      create: {
        name: 'Lámpara LED de Escritorio',
        slug: 'lampara-led-escritorio',
        description: 'Lámpara LED con 3 temperaturas de color y 10 niveles de brillo. Brazo flexible ajustable. Puerto USB para carga. Base estable antideslizante.',
        shortDescription: 'Lámpara LED con brillo ajustable',
        sku: 'BM-HOG-003',
        basePrice: 1290,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'kit-bandas-elasticas-fitness' },
      update: {},
      create: {
        name: 'Kit Bandas Elásticas Fitness',
        slug: 'kit-bandas-elasticas-fitness',
        description: 'Set de 5 bandas elásticas de resistencia variable. Incluye bolsa de transporte. Ideales para ejercicios en casa, yoga y rehabilitación.',
        shortDescription: 'Set de 5 bandas de resistencia',
        sku: 'BM-DEP-001',
        basePrice: 790,
        isActive: true,
      },
    }),
  ]);
  console.log(`  ${products.length} products created`);

  // Product-Category associations
  await Promise.all([
    prisma.productCategory.createMany({
      data: [
        { productId: products[0].id, categoryId: categories[1].id },
        { productId: products[0].id, categoryId: subcategories[3].id },
        { productId: products[1].id, categoryId: categories[0].id },
        { productId: products[1].id, categoryId: subcategories[0].id },
        { productId: products[2].id, categoryId: categories[2].id },
        { productId: products[3].id, categoryId: categories[1].id },
        { productId: products[3].id, categoryId: subcategories[3].id },
        { productId: products[4].id, categoryId: categories[0].id },
        { productId: products[4].id, categoryId: subcategories[1].id },
        { productId: products[5].id, categoryId: categories[1].id },
        { productId: products[6].id, categoryId: categories[0].id },
        { productId: products[6].id, categoryId: subcategories[1].id },
        { productId: products[7].id, categoryId: categories[5].id },
      ],
      skipDuplicates: true,
    }),
  ]);
  console.log('  Product-category associations created');

  // Product variants
  await Promise.all([
    // Auriculares - colors
    prisma.productVariant.createMany({
      data: [
        { productId: products[0].id, name: 'Negro', sku: 'BM-AUD-001-BLK', type: VariantType.COLOR, value: 'Negro', stock: 25, priceAdjustment: 0 },
        { productId: products[0].id, name: 'Blanco', sku: 'BM-AUD-001-WHT', type: VariantType.COLOR, value: 'Blanco', stock: 18, priceAdjustment: 0 },
        { productId: products[0].id, name: 'Azul', sku: 'BM-AUD-001-BLU', type: VariantType.COLOR, value: 'Azul', stock: 12, priceAdjustment: 100 },
      ],
      skipDuplicates: true,
    }),
    // Termo - colors
    prisma.productVariant.createMany({
      data: [
        { productId: products[1].id, name: 'Plateado', sku: 'BM-HOG-001-SLV', type: VariantType.COLOR, value: 'Plateado', stock: 30, priceAdjustment: 0 },
        { productId: products[1].id, name: 'Negro Mate', sku: 'BM-HOG-001-BLK', type: VariantType.COLOR, value: 'Negro Mate', stock: 22, priceAdjustment: 150 },
      ],
      skipDuplicates: true,
    }),
    // Mochila - colors
    prisma.productVariant.createMany({
      data: [
        { productId: products[2].id, name: 'Negro', sku: 'BM-ACC-001-BLK', type: VariantType.COLOR, value: 'Negro', stock: 15, priceAdjustment: 0 },
        { productId: products[2].id, name: 'Gris', sku: 'BM-ACC-001-GRY', type: VariantType.COLOR, value: 'Gris', stock: 10, priceAdjustment: 0 },
        { productId: products[2].id, name: 'Azul Marino', sku: 'BM-ACC-001-NVY', type: VariantType.COLOR, value: 'Azul Marino', stock: 8, priceAdjustment: 100 },
      ],
      skipDuplicates: true,
    }),
    // Parlante - colors
    prisma.productVariant.createMany({
      data: [
        { productId: products[3].id, name: 'Negro', sku: 'BM-AUD-002-BLK', type: VariantType.COLOR, value: 'Negro', stock: 20, priceAdjustment: 0 },
        { productId: products[3].id, name: 'Rojo', sku: 'BM-AUD-002-RED', type: VariantType.COLOR, value: 'Rojo', stock: 14, priceAdjustment: 0 },
      ],
      skipDuplicates: true,
    }),
    // Smartwatch - size
    prisma.productVariant.createMany({
      data: [
        { productId: products[5].id, name: '42mm', sku: 'BM-TEC-001-42', type: VariantType.SIZE, value: '42mm', stock: 10, priceAdjustment: 0 },
        { productId: products[5].id, name: '46mm', sku: 'BM-TEC-001-46', type: VariantType.SIZE, value: '46mm', stock: 8, priceAdjustment: 300 },
      ],
      skipDuplicates: true,
    }),
    // Bandas - standalone
    prisma.productVariant.createMany({
      data: [
        { productId: products[7].id, name: 'Set Completo', sku: 'BM-DEP-001-SET', type: VariantType.STYLE, value: 'Set Completo', stock: 35, priceAdjustment: 0 },
      ],
      skipDuplicates: true,
    }),
  ]);
  console.log('  Product variants created');

  // Product images (placeholder URLs)
  await prisma.productImage.createMany({
    data: [
      { productId: products[0].id, url: '/images/products/auriculares-1.jpg', altText: 'Auriculares Bluetooth Pro', isPrimary: true, sortOrder: 0 },
      { productId: products[1].id, url: '/images/products/termo-1.jpg', altText: 'Termo Acero Inoxidable 1L', isPrimary: true, sortOrder: 0 },
      { productId: products[2].id, url: '/images/products/mochila-1.jpg', altText: 'Mochila Urbana Resistente', isPrimary: true, sortOrder: 0 },
      { productId: products[3].id, url: '/images/products/parlante-1.jpg', altText: 'Parlante Portátil Waterproof', isPrimary: true, sortOrder: 0 },
      { productId: products[4].id, url: '/images/products/organizadores-1.jpg', altText: 'Set Organizadores para Hogar', isPrimary: true, sortOrder: 0 },
      { productId: products[5].id, url: '/images/products/smartwatch-1.jpg', altText: 'Reloj Smartwatch Deportivo', isPrimary: true, sortOrder: 0 },
      { productId: products[6].id, url: '/images/products/lampara-1.jpg', altText: 'Lámpara LED de Escritorio', isPrimary: true, sortOrder: 0 },
      { productId: products[7].id, url: '/images/products/bandas-1.jpg', altText: 'Kit Bandas Elásticas Fitness', isPrimary: true, sortOrder: 0 },
    ],
    skipDuplicates: true,
  });
  console.log('  Product images created');

  // ============================================================
  // SHIPPING ZONES (Uruguay)
  // ============================================================
  await Promise.all([
    prisma.shippingZone.upsert({
      where: { id: 'zone-montevideo' },
      update: {},
      create: {
        id: 'zone-montevideo',
        name: 'Montevideo',
        departments: ['Montevideo'],
        baseCost: 150,
        freeAbove: 3000,
        estimatedDays: 1,
        isActive: true,
      },
    }),
    prisma.shippingZone.upsert({
      where: { id: 'zone-metropolitana' },
      update: {},
      create: {
        id: 'zone-metropolitana',
        name: 'Área Metropolitana',
        departments: ['Canelones', 'San José'],
        baseCost: 200,
        freeAbove: 4000,
        estimatedDays: 2,
        isActive: true,
      },
    }),
    prisma.shippingZone.upsert({
      where: { id: 'zone-litoral' },
      update: {},
      create: {
        id: 'zone-litoral',
        name: 'Litoral',
        departments: ['Colonia', 'Soriano', 'Río Negro', 'Paysandú', 'Salto', 'Artigas'],
        baseCost: 350,
        freeAbove: 5000,
        estimatedDays: 4,
        isActive: true,
      },
    }),
    prisma.shippingZone.upsert({
      where: { id: 'zone-este' },
      update: {},
      create: {
        id: 'zone-este',
        name: 'Este',
        departments: ['Maldonado', 'Rocha', 'Lavalleja', 'Treinta y Tres'],
        baseCost: 300,
        freeAbove: 5000,
        estimatedDays: 3,
        isActive: true,
      },
    }),
    prisma.shippingZone.upsert({
      where: { id: 'zone-centro-norte' },
      update: {},
      create: {
        id: 'zone-centro-norte',
        name: 'Centro-Norte',
        departments: ['Florida', 'Durazno', 'Flores', 'Tacuarembó', 'Rivera', 'Cerro Largo'],
        baseCost: 350,
        freeAbove: 5000,
        estimatedDays: 5,
        isActive: true,
      },
    }),
  ]);
  console.log('  Shipping zones created');

  // ============================================================
  // BANNERS
  // ============================================================
  await prisma.banner.createMany({
    data: [
      {
        title: '¡Nuevos Productos!',
        subtitle: 'Descubrí las últimas novedades en nuestra tienda',
        imageUrl: '/images/banners/hero-1.jpg',
        linkUrl: '/productos',
        position: 'hero',
        sortOrder: 0,
        isActive: true,
      },
      {
        title: 'Envío Gratis',
        subtitle: 'En compras mayores a $3.000 para Montevideo',
        imageUrl: '/images/banners/promo-envio.jpg',
        position: 'promo',
        sortOrder: 1,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log('  Banners created');

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
