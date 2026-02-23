import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const ASSISTANT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description:
        'Search products in the Bengala Max catalog. Use the query parameter with the EXACT product name the customer asked for. For example, if they ask for "cuadernos", search "cuaderno". Do NOT search for accessories or related products unless the customer asks.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search query — use the exact product type the customer mentioned. Keep it simple: "cuaderno", "lapicera", "mochila", etc.',
          },
          categorySlug: {
            type: 'string',
            description: 'Category slug to filter by',
          },
          minPrice: {
            type: 'number',
            description: 'Minimum price in UYU',
          },
          maxPrice: {
            type: 'number',
            description: 'Maximum price in UYU',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product_details',
      description:
        'Get detailed information about a specific product by its slug (URL identifier). Use when the user wants more info about a product.',
      parameters: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'The product slug (URL identifier)',
          },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_categories',
      description:
        'Get all available product categories. Use to help users explore the catalog or find what they are looking for.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_order_status',
      description:
        'Check the status of an order by its order number. Only works if the user is logged in.',
      parameters: {
        type: 'object',
        properties: {
          orderNumber: {
            type: 'string',
            description: 'The order number (e.g., BM-000001)',
          },
        },
        required: ['orderNumber'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_shipping_info',
      description:
        'Get shipping zones, delivery costs and estimated delivery times.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_store_info',
      description:
        'Get information about the store: payment methods, return policy, shipping policy, general info.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['payment_methods', 'returns', 'shipping', 'general'],
            description: 'The topic to get information about',
          },
        },
        required: ['topic'],
      },
    },
  },
];
