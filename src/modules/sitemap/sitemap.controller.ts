import { Controller, Get, Header } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

const SITE_URL = 'https://bengalamax.uy';

@Controller('sitemap.xml')
export class SitemapController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=3600')
  async getSitemap(): Promise<string> {
    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/productos', priority: '0.9', changefreq: 'daily' },
      { url: '/preguntas-frecuentes', priority: '0.3', changefreq: 'monthly' },
      { url: '/terminos-y-condiciones', priority: '0.2', changefreq: 'yearly' },
      { url: '/politica-de-privacidad', priority: '0.2', changefreq: 'yearly' },
      { url: '/politica-de-devoluciones', priority: '0.2', changefreq: 'yearly' },
    ];

    const urls = [
      ...staticPages.map(
        (p) =>
          `  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
      ),
      ...categories.map(
        (c) =>
          `  <url>
    <loc>${SITE_URL}/categorias/${c.slug}</loc>
    <lastmod>${c.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
      ),
      ...products.map(
        (p) =>
          `  <url>
    <loc>${SITE_URL}/productos/${p.slug}</loc>
    <lastmod>${p.updatedAt.toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`,
      ),
    ];

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  }
}
