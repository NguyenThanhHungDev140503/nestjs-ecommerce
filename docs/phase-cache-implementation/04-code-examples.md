# Code Examples - Caching Implementation

## 1. Cache Module

### 1.1. cache.module.ts

```typescript
// libs/common/cache/cache.module.ts
import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import Keyv from 'keyv';
import { CacheService } from './cache.service';
import { CacheInvalidationService } from './cache-invalidation.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST', 'localhost');
        const redisPort = configService.get('REDIS_PORT', 6379);
        const redisPassword = configService.get('REDIS_PASSWORD', '');
        const redisDb = configService.get('REDIS_DB', 0);
        const cacheTtl = configService.get('CACHE_TTL', 60000);

        return {
          stores: [
            // L1: In-memory cache (fastest, per-instance)
            new Keyv({
              namespace: 'ecommerce-l1',
              ttl: cacheTtl,
            }),
            // L2: Redis cache (distributed, shared)
            await redisStore({
              socket: {
                host: redisHost,
                port: redisPort,
              },
              password: redisPassword || undefined,
              database: redisDb,
            }),
          ],
          ttl: cacheTtl,
          isGlobal: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService, CacheInvalidationService],
  exports: [CacheModule, CacheService, CacheInvalidationService],
})
export class RedisCacheModule {}
```

### 1.2. cache.service.ts

```typescript
// libs/common/cache/cache.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache HIT: ${key}`);
      } else {
        this.logger.debug(`Cache MISS: ${key}`);
      }
      return value ?? null;
    } catch (error) {
      this.logger.error(`Cache GET error: ${key}`, error.message);
      return null;
    }
  }

  /**
   * Set value to cache with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache SET: ${key}, TTL: ${ttl || 'default'}ms`);
    } catch (error) {
      this.logger.error(`Cache SET error: ${key}`, error.message);
    }
  }

  /**
   * Delete a specific key
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error: ${key}`, error.message);
    }
  }

  /**
   * Reset entire cache
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.warn('Cache RESET: All cache cleared');
    } catch (error) {
      this.logger.error('Cache RESET error', error.message);
    }
  }

  /**
   * Wrap a function with caching (cache-aside pattern)
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    if (result !== null && result !== undefined) {
      await this.set(key, result, ttl);
    }
    return result;
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    return this.wrap(key, factory, ttl);
  }
}
```

### 1.3. cache.constants.ts

```typescript
// libs/common/cache/cache.constants.ts

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
```

### 1.4. index.ts

```typescript
// libs/common/cache/index.ts
export * from './cache.module';
export * from './cache.service';
export * from './cache.constants';
export * from './cache-invalidation.service';
```

## 2. HTTP Cache Interceptor

### 2.1. http-cache.interceptor.ts

```typescript
// apps/api-gateway/src/interceptors/http-cache.interceptor.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  /**
   * Determine if request should be cached
   */
  protected isRequestCacheable(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return false;
    }

    // Skip caching for user-specific endpoints
    const skipPaths = [
      '/api/v1/orders',      // Orders vary by user
      '/api/v1/customers/me', // Current user endpoint
    ];

    if (skipPaths.some((path) => request.url.startsWith(path))) {
      return false;
    }

    return true;
  }

  /**
   * Generate cache key from request
   */
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();

    // Include query params in cache key
    const queryString = new URLSearchParams(request.query).toString();
    const baseKey = request.url.split('?')[0];

    return queryString ? `${baseKey}?${queryString}` : baseKey;
  }
}
```

## 3. Service-level Caching Examples

### 3.1. Inventory Service với Caching

```typescript
// apps/inventory-service/src/inventory-service.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { CacheService, CACHE_KEYS, CACHE_TTL } from 'libs/common/cache';
import { PrismaService } from 'libs/common/database/prisma.service';
import { ProductDetails } from 'libs/common/interfaces/inventory.interface';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get product by ID with caching
   */
  async getProductById(productId: string): Promise<ProductDetails> {
    const cacheKey = CACHE_KEYS.PRODUCTS.DETAIL(productId);

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        const product = await this.prisma.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          throw new RpcException({
            statusCode: 404,
            message: `Product not found: ${productId}`,
          });
        }

        return this.mapToProductDetails(product);
      },
      CACHE_TTL.PRODUCTS.DETAIL,
    );
  }

  /**
   * Update product and invalidate cache
   */
  async updateProduct(
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductDetails> {
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: dto,
    });

    // Invalidate related caches
    await this.invalidateProductCaches(productId);

    return this.mapToProductDetails(product);
  }

  /**
   * Invalidate all product-related caches
   */
  private async invalidateProductCaches(productId: string): Promise<void> {
    await Promise.all([
      this.cacheService.del(CACHE_KEYS.PRODUCTS.DETAIL(productId)),
      this.cacheService.del(CACHE_KEYS.INVENTORY.DETAIL(productId)),
    ]);
    this.logger.log(`Cache invalidated for product: ${productId}`);
  }
}
```

## 4. Controller với Cache Decorators

### 4.1. Product Controller

```typescript
// apps/api-gateway/src/product/product.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { ProductGatewayService } from './product.service';
import { HttpCacheInterceptor } from '../interceptors/http-cache.interceptor';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductGatewayService) {}

  @Get()
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(300000) // 5 minutes
  async getAllProducts(@Query() query: ProductQueryDto) {
    return this.productService.getAllProducts(query);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('product-detail')
  @CacheTTL(300000) // 5 minutes
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  @Post()
  async createProduct(@Body() dto: CreateProductDto) {
    // No caching for write operations
    return this.productService.createProduct(dto);
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    // Cache invalidation happens in service layer
    return this.productService.updateProduct(id, dto);
  }
}
```

Xem [05-cache-invalidation.md](./05-cache-invalidation.md) để biết chi tiết cache invalidation.

