/**
 * Cache key patterns for different entities
 */
export const CACHE_KEYS = {
  PRODUCTS: {
    LIST: (page: number, limit: number) => `products:list:${page}:${limit}`,
    DETAIL: (id: string) => `products:${id}`,
    ALL_PATTERN: 'products:*',
  },
  CUSTOMERS: {
    DETAIL: (id: string) => `customers:${id}`,
    ALL_PATTERN: 'customers:*',
  },
  INVENTORY: {
    DETAIL: (productId: string) => `inventory:${productId}`,
    STOCK: (productId: string) => `inventory:stock:${productId}`,
    ALL_PATTERN: 'inventory:*',
  },
  ORDERS: {
    LIST: (customerId: string) => `orders:customer:${customerId}`,
    DETAIL: (id: string) => `orders:${id}`,
    ALL_PATTERN: 'orders:*',
  },
} as const;

/**
 * TTL values in milliseconds
 */
export const CACHE_TTL = {
  PRODUCTS: {
    LIST: 5 * 60 * 1000,    // 5 minutes
    DETAIL: 5 * 60 * 1000,  // 5 minutes
  },
  CUSTOMERS: {
    DETAIL: 10 * 60 * 1000, // 10 minutes
  },
  INVENTORY: {
    DETAIL: 30 * 1000,      // 30 seconds
    STOCK: 15 * 1000,       // 15 seconds (more volatile)
  },
  ORDERS: {
    LIST: 30 * 1000,        // 30 seconds
    DETAIL: 60 * 1000,      // 1 minute
  },
  DEFAULT: 60 * 1000,       // 1 minute
} as const;
