import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { CategoriesService } from '../categories/categories.service';
import { OrdersService } from '../orders/orders.service';
import { ShippingService } from '../shipping/shipping.service';
import { CartService } from '../cart/cart.service';
import { ProductQueryDto } from '../products/dto/product-query.dto';
import { ASSISTANT_TOOLS } from './assistant.tools';

interface ChatProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  image: string | null;
}

export interface ChatResponse {
  message: string;
  products: ChatProduct[];
  conversationId: string;
  messageId: string;
  cartUpdated?: boolean;
}

const SYSTEM_PROMPT = `Sos Rayitas, el asistente de ventas de Bengala Max, una tienda online de variedades en Uruguay. Sos un vendedor nato: tu objetivo es ayudar al cliente a encontrar lo que busca y SIEMPRE cerrar una venta.

Comportamiento de vendedor:
- Busca EXACTAMENTE lo que el cliente pide. Si pide "cuadernola rosada", busca eso.
- Si el producto exacto no esta disponible o no existe, NUNCA digas solo "no tenemos". Siempre ofrece alternativas: "No encontre la cuadernola rosada, pero tenemos estas cuadernolas que te pueden gustar:" y busca con un termino mas amplio (ej: "cuadernola").
- Si la busqueda es amplia, pregunta brevemente que necesita para afinar: "¿Buscas cuadernos chicos, grandes, de espiral?"
- Mostra los productos mas relevantes primero (maximo 3-4, no tires todo junto).
- Una vez que el cliente eligio o mostro interes, sugeri complementos naturales: "¿Necesitas lapiceras o un estuche tambien?"
- Se entusiasta pero no invasivo. Recomenda, no empujes.
- Todos los productos que muestres estan disponibles y con stock. Si un producto no tiene stock, no lo muestres.

Estrategia de venta:
- SIEMPRE intenta mostrar al menos un producto. Si no encontras lo exacto, amplia la busqueda (ej: de "catan" a "juegos de mesa", de "nike air max" a "zapatillas").
- Si el cliente dice que algo es caro, ofrece opciones mas economicas del mismo tipo.
- Si el cliente esta indeciso, destaca el producto que mas le conviene y explica por que.
- Cuando un cliente llega sin saber que quiere, preguntale para quien es o que ocasion, y sugeri productos populares.

Carrito de compras:
- Cuando el cliente pide que le armes un carrito, lista de utiles, o quiere comprar varios productos: usa la tool add_to_cart para agregar productos directamente al carrito.
- Si el cliente no esta logueado, indicale que inicie sesion para poder armar el carrito.
- Cuando armes una lista (ej: utiles escolares), busca cada tipo de producto por separado, elegí la mejor opcion de cada uno, y agregalos al carrito uno por uno.
- Despues de agregar al carrito, confirma brevemente lo que agregaste y el total aproximado. No muestres las cards de los productos que ya agregaste.
- Si un producto no se pudo agregar (sin stock, error), informale al cliente.

Reglas generales:
- Responde siempre en español informal rioplatense (vos/tu, "dale", "genial", "barbaro")
- Moneda: pesos uruguayos (UYU), formato: $1.234
- Se conciso y directo — respuestas cortas, no parrafos largos
- Usa las tools para buscar productos antes de recomendar. NUNCA inventes productos ni precios.
- Si la primera busqueda no da buenos resultados, intenta con sinonimos o terminos mas amplios
- Si el usuario pregunta por un pedido y no esta logueado, indicale que inicie sesion
- No uses markdown (bold, italic, headers) — responde en texto plano
- Cuando muestres productos, no repitas nombre/precio ya que se ven en las cards. Agrega valor: opina, compara, destaca ventajas.
- Cuando hagas busquedas multiples (ej: lista de utiles), hacelo de forma eficiente: busca cada categoria en una tool call separada, no mandes 8 busquedas a la vez.`;

const MAX_TOOL_CALLS = 10;

interface ToolResult {
  data: any;
  products?: ChatProduct[];
  cartUpdated?: boolean;
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private openai: OpenAI;
  private model: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private ordersService: OrdersService,
    private shippingService: ShippingService,
    private cartService: CartService,
  ) {
    const baseURL = this.configService.get<string>('OPENAI_BASE_URL');
    this.openai = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
      ...(baseURL && { baseURL }),
    });
    this.model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o');
  }

  async chat(
    messages: { role: 'user' | 'assistant'; content: string }[],
    userId?: string,
    conversationId?: string,
  ): Promise<ChatResponse> {
    const allProducts: ChatProduct[] = [];
    const toolsUsed: string[] = [];
    let cartUpdated = false;

    const openaiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(
        (m) =>
          ({
            role: m.role,
            content: m.content,
          }) as ChatCompletionMessageParam,
      ),
    ];

    let toolCallCount = 0;
    let assistantMessage = '';

    try {
      while (toolCallCount < MAX_TOOL_CALLS) {
        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: openaiMessages,
          tools: ASSISTANT_TOOLS as ChatCompletionTool[],
          tool_choice: 'auto',
        });

        const choice = response.choices[0];

        if (
          choice.finish_reason === 'stop' ||
          !choice.message.tool_calls?.length
        ) {
          assistantMessage = choice.message.content ?? '';
          break;
        }

        // Add assistant message with tool calls
        openaiMessages.push(choice.message);

        // Process each tool call
        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.type !== 'function') continue;
          toolCallCount++;
          toolsUsed.push(toolCall.function.name);
          const args = JSON.parse(toolCall.function.arguments);
          const result = await this.executeTool(
            toolCall.function.name,
            args,
            userId,
          );

          // Collect products from search results
          if (result.products) {
            allProducts.push(...result.products);
          }

          if (result.cartUpdated) {
            cartUpdated = true;
          }

          openaiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result.data),
          });
        }
      }

      // If we exceeded max tool calls without a stop, get a final response
      if (!assistantMessage) {
        const finalResponse = await this.openai.chat.completions.create({
          model: this.model,
          messages: openaiMessages,
        });
        assistantMessage = finalResponse.choices[0].message.content ?? '';
      }
    } catch (error) {
      const err = error as any;
      this.logger.error(
        `OpenAI API error: ${err.message} | status=${err.status} code=${err.code} | type=${err.type} | response=${JSON.stringify(err.error ?? err.response?.data ?? null)}`,
        err.stack,
      );
      throw error;
    }

    const products = this.deduplicateProducts(allProducts);

    // Log conversation (fire-and-forget)
    const logResult = this.logConversation(
      messages,
      assistantMessage,
      products,
      toolsUsed,
      userId,
      conversationId,
    ).catch((err) =>
      this.logger.error(`Failed to log conversation: ${(err as Error).message}`),
    );

    // Await the log to get the IDs (fast DB write)
    const log = await logResult;

    return {
      message: assistantMessage,
      products,
      conversationId: log?.conversationId ?? conversationId ?? '',
      messageId: log?.messageId ?? '',
      ...(cartUpdated && { cartUpdated: true }),
    };
  }

  async submitFeedback(messageId: string, feedback: number): Promise<void> {
    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { feedback },
    });
  }

  private async logConversation(
    messages: { role: 'user' | 'assistant'; content: string }[],
    assistantMessage: string,
    products: ChatProduct[],
    toolsUsed: string[],
    userId?: string,
    conversationId?: string,
  ): Promise<{ conversationId: string; messageId: string }> {
    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const conv = await this.prisma.chatConversation.create({
        data: { userId: userId ?? null },
      });
      convId = conv.id;
    } else {
      // Update the updatedAt timestamp
      await this.prisma.chatConversation
        .update({
          where: { id: convId },
          data: { userId: userId ?? undefined },
        })
        .catch(() => {
          // Conversation not found, create new
        });
    }

    // Save only the last user message + assistant response (not the full history)
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg) {
      await this.prisma.chatMessage.create({
        data: {
          conversationId: convId,
          role: 'user',
          content: lastUserMsg.content,
          toolsUsed: [],
        },
      });
    }

    const assistantMsg = await this.prisma.chatMessage.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: assistantMessage,
        products: products.length > 0 ? (products as any) : undefined,
        toolsUsed,
      },
    });

    return { conversationId: convId, messageId: assistantMsg.id };
  }

  private async executeTool(
    name: string,
    args: Record<string, any>,
    userId?: string,
  ): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_products':
          return this.toolSearchProducts(args);
        case 'get_product_details':
          return this.toolGetProductDetails(args.slug);
        case 'get_categories':
          return this.toolGetCategories();
        case 'check_order_status':
          return this.toolCheckOrderStatus(args.orderNumber, userId);
        case 'get_shipping_info':
          return this.toolGetShippingInfo();
        case 'get_store_info':
          return this.toolGetStoreInfo(args.topic);
        case 'add_to_cart':
          return this.toolAddToCart(args.items, userId);
        default:
          return { data: { error: `Unknown tool: ${name}` } };
      }
    } catch (error) {
      this.logger.error(`Tool ${name} failed: ${(error as Error).message}`);
      return { data: { error: `Failed to execute ${name}` } };
    }
  }

  private async toolSearchProducts(args: {
    query?: string;
    categorySlug?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<ToolResult> {
    // Use PostgreSQL full-text search for better relevance when a query is provided
    if (args.query && args.query.trim()) {
      return this.fullTextSearchProducts(args);
    }

    // Fallback to standard search for category/price-only filters
    const query = Object.assign(new ProductQueryDto(), {
      categorySlug: args.categorySlug,
      minPrice: args.minPrice,
      maxPrice: args.maxPrice,
      limit: 12,
      page: 1,
    });
    const result = await this.productsService.findAll(query);
    return this.formatProductResults(result);
  }

  /**
   * Full-text search with tiered scoring for accurate relevance.
   *
   * Uses the 'simple' text-search config (no stemming) so that prefix
   * matching (`:*`) works on the literal characters.  With the 'spanish'
   * config, "catan:*" was being stemmed to "cat:*" which matched
   * "Catalogo", "Cat", "Catch", "Catre", etc.
   *
   * Scoring tiers (highest wins):
   *   100 — product name contains the search query (ILIKE)
   *    50 — full-text prefix match on name ('simple' dictionary)
   *    10 — description contains the search query (ILIKE)
   *     + ts_rank for fine-grained ordering within a tier
   */
  private async fullTextSearchProducts(args: {
    query?: string;
    categorySlug?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<ToolResult> {
    const rawQuery = (args.query ?? '').trim();
    const searchTerms = rawQuery
      .split(/\s+/)
      .filter((t) => t.length > 1)
      .map((t) => t.replace(/[^a-zA-Z0-9áéíóúñüÁÉÍÓÚÑÜ]/g, ''))
      .filter(Boolean);

    if (searchTerms.length === 0) {
      return { data: { products: [], total: 0 }, products: [] };
    }

    // Build filter conditions (active, in stock, category, price range)
    const conditions: string[] = [
      'p."isActive" = true',
      'EXISTS (SELECT 1 FROM "product_variants" pv WHERE pv."productId" = p.id AND pv."isActive" = true AND pv.stock > 0)',
    ];
    const params: any[] = [];
    let paramIndex = 1;

    if (args.categorySlug) {
      conditions.push(
        `EXISTS (SELECT 1 FROM "product_categories" pc JOIN "categories" c ON c.id = pc."categoryId" WHERE pc."productId" = p.id AND c.slug = $${paramIndex})`,
      );
      params.push(args.categorySlug);
      paramIndex++;
    }
    if (args.minPrice !== undefined) {
      conditions.push(`p."basePrice" >= $${paramIndex}`);
      params.push(args.minPrice);
      paramIndex++;
    }
    if (args.maxPrice !== undefined) {
      conditions.push(`p."basePrice" <= $${paramIndex}`);
      params.push(args.maxPrice);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // 'simple' dictionary: no stemming, so "catan:*" matches words starting with "catan" literally
    const tsQuery = searchTerms.map((t) => `${t}:*`).join(' & ');
    const ilikeTerm = `%${rawQuery}%`;

    params.push(ilikeTerm);
    const ilikeIdx = paramIndex;
    paramIndex++;
    params.push(tsQuery);
    const tsIdx = paramIndex;

    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT p.id, p.name, p.slug, p."basePrice",
              p."compareAtPrice", p."shortDescription",
              (SELECT url FROM "product_images" pi WHERE pi."productId" = p.id ORDER BY pi."isPrimary" DESC, pi."sortOrder" ASC LIMIT 1) as image,
              (CASE WHEN p.name ILIKE $${ilikeIdx} THEN 100 ELSE 0 END) +
              (CASE WHEN to_tsvector('simple', coalesce(p.name, ''))
                         @@ to_tsquery('simple', $${tsIdx}) THEN 50 ELSE 0 END) +
              (CASE WHEN p.description ILIKE $${ilikeIdx} THEN 10 ELSE 0 END) +
              ts_rank(
                setweight(to_tsvector('simple', coalesce(p.name, '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(p.description, '')), 'B'),
                to_tsquery('simple', $${tsIdx})
              ) as score
       FROM "products" p
       WHERE ${whereClause}
         AND (
           p.name ILIKE $${ilikeIdx}
           OR p.description ILIKE $${ilikeIdx}
           OR to_tsvector('simple', coalesce(p.name, '') || ' ' || coalesce(p.description, ''))
              @@ to_tsquery('simple', $${tsIdx})
         )
       ORDER BY score DESC
       LIMIT 8`,
      ...params,
    );

    const products: ChatProduct[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      basePrice: Number(r.basePrice),
      image: r.image ?? null,
    }));

    const data = rows.map((r) => ({
      name: r.name,
      slug: r.slug,
      price: Number(r.basePrice),
      compareAtPrice: r.compareAtPrice ? Number(r.compareAtPrice) : null,
      shortDescription: r.shortDescription,
      inStock: true,
    }));

    return {
      data: { products: data, total: rows.length },
      products,
    };
  }

  private formatProductResults(result: any): ToolResult {
    // Only include products that have at least one variant in stock
    const inStockItems = result.data.filter(
      (p: any) => p.variants?.some((v: any) => v.stock > 0) ?? false,
    );

    const products: ChatProduct[] = inStockItems.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      basePrice: Number(p.basePrice),
      image: p.images?.[0]?.url ?? null,
    }));

    const data = inStockItems.map((p: any) => ({
      name: p.name,
      slug: p.slug,
      price: Number(p.basePrice),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      shortDescription: p.shortDescription,
      inStock: true,
    }));

    return {
      data: { products: data, total: products.length },
      products,
    };
  }

  private async toolGetProductDetails(
    slug: string,
  ): Promise<ToolResult> {
    const p = await this.productsService.findBySlug(slug);

    const product: ChatProduct = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      basePrice: Number(p.basePrice),
      image: (p as any).images?.[0]?.url ?? null,
    };

    return {
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: Number(p.basePrice),
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        categories: (p as any).categories?.map((c: any) => c.category?.name),
        averageRating: (p as any).averageRating,
        reviewCount: (p as any).reviewCount,
        variants: (p as any).variants?.map((v: any) => ({
          name: v.name,
          type: v.type,
          value: v.value,
          priceAdjustment: Number(v.priceAdjustment),
          inStock: v.stock > 0,
        })),
      },
      products: [product],
    };
  }

  private async toolGetCategories(): Promise<ToolResult> {
    const categories = await this.categoriesService.findAll();

    return {
      data: categories.map((c: any) => ({
        name: c.name,
        slug: c.slug,
        description: c.description,
        childCount: c.children?.length ?? 0,
      })),
    };
  }

  private async toolCheckOrderStatus(
    orderNumber: string,
    userId?: string,
  ): Promise<ToolResult> {
    if (!userId) {
      return {
        data: {
          error:
            'El usuario no esta logueado. Indicale que inicie sesion para consultar pedidos.',
        },
      };
    }

    try {
      const order = await this.ordersService.findByOrderNumber(
        orderNumber,
        userId,
      );

      return {
        data: {
          orderNumber: order.orderNumber,
          status: order.status,
          total: Number(order.total),
          createdAt: order.createdAt,
          estimatedDelivery: order.estimatedDelivery,
          trackingNumber: order.trackingNumber,
          items: order.items.map((i: any) => ({
            name: i.productName,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          })),
        },
      };
    } catch {
      return {
        data: {
          error: `No se encontro el pedido ${orderNumber} para este usuario.`,
        },
      };
    }
  }

  private async toolGetShippingInfo(): Promise<ToolResult> {
    const result = await this.shippingService.findAllZones();

    return {
      data: (result as any).data.map((z: any) => ({
        name: z.name,
        departments: z.departments,
        cost: Number(z.baseCost),
        freeAbove: z.freeAbove ? Number(z.freeAbove) : null,
        estimatedDays: z.estimatedDays,
      })),
    };
  }

  private async toolAddToCart(
    items: { slug: string; quantity?: number }[],
    userId?: string,
  ): Promise<ToolResult> {
    if (!userId) {
      return {
        data: {
          error:
            'El usuario no esta logueado. Indicale que debe iniciar sesion para poder agregar productos al carrito.',
        },
      };
    }

    if (!items || items.length === 0) {
      return { data: { error: 'No se proporcionaron productos para agregar.' } };
    }

    const results: { slug: string; name: string; added: boolean; error?: string }[] = [];
    let anyAdded = false;

    for (const item of items) {
      try {
        // Find product by slug
        const product = await this.prisma.product.findUnique({
          where: { slug: item.slug },
          include: {
            variants: {
              where: { isActive: true, stock: { gt: 0 } },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        });

        if (!product || !product.isActive) {
          results.push({ slug: item.slug, name: item.slug, added: false, error: 'Producto no encontrado' });
          continue;
        }

        const variant = product.variants[0];
        if (!variant) {
          results.push({ slug: item.slug, name: product.name, added: false, error: 'Sin stock disponible' });
          continue;
        }

        await this.cartService.addItem(userId, {
          productId: product.id,
          variantId: variant.id,
          quantity: item.quantity ?? 1,
        });

        results.push({ slug: item.slug, name: product.name, added: true });
        anyAdded = true;
      } catch (error) {
        const msg = (error as Error).message ?? 'Error desconocido';
        results.push({ slug: item.slug, name: item.slug, added: false, error: msg });
      }
    }

    const addedCount = results.filter((r) => r.added).length;
    return {
      data: {
        results,
        summary: `${addedCount} de ${items.length} productos agregados al carrito`,
      },
      cartUpdated: anyAdded,
    };
  }

  private toolGetStoreInfo(topic: string): ToolResult {
    const info: Record<string, any> = {
      payment_methods: {
        methods: [
          {
            name: 'MercadoPago',
            description:
              'Tarjetas de credito/debito, transferencia bancaria, y mas',
          },
          {
            name: 'dLocal Go',
            description: 'Pagos con tarjetas internacionales',
          },
        ],
        currency: 'UYU (pesos uruguayos)',
        note: 'Todos los precios incluyen IVA',
      },
      returns: {
        policy:
          'Aceptamos devoluciones dentro de los 30 dias de recibido el producto',
        conditions: [
          'El producto debe estar sin uso y en su empaque original',
          'Contactar por email o chat para iniciar la devolucion',
          'El reembolso se procesa dentro de 5-10 dias habiles',
        ],
      },
      shipping: {
        description: 'Realizamos envios a todo Uruguay',
        note: 'Los costos y tiempos varian segun la zona. Usa la tool get_shipping_info para ver detalles.',
      },
      general: {
        name: 'Bengala Max',
        description: 'Tienda online de variedades en Uruguay',
        country: 'Uruguay',
        currency: 'UYU',
        support: 'Podes escribirnos por este chat o por email',
      },
    };

    return { data: info[topic] ?? info.general };
  }

  private deduplicateProducts(products: ChatProduct[]): ChatProduct[] {
    const seen = new Set<string>();
    return products.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }
}
