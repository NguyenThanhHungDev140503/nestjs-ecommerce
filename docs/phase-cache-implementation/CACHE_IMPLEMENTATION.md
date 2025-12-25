# Cache Implementation Guide

## Overview
This document describes the caching implementation for the NestJS E-commerce Microservices project.

## Architecture
- **L1 Cache**: In-memory cache using Keyv (per-instance, ultra-fast)
- **L2 Cache**: Redis distributed cache (shared across instances)

## Dependencies Added
```bash
yarn add @nestjs/cache-manager cache-manager cache-manager-redis-yet keyv @keyv/redis
```

## Infrastructure Changes

### Docker Compose
- Added Redis service with persistence and health checks
- Port: 6379
- Volume: redis_data:/data

### Environment Variables
```
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL=60000
CACHE_MAX_SIZE=100
```

## Implementation Details

### Cache Module (`libs/common/src/cache/`)
- `cache.module.ts`: Global module with multi-layer cache configuration
- `cache.service.ts`: Service with get/set/del/wrap methods
- `cache.constants.ts`: Cache key patterns and TTL values
- `cache-invalidation.service.ts`: Event-based cache invalidation

### API Gateway Changes
- Added `RedisCacheModule` to `api-gateway.module.ts`
- Created `HttpCacheInterceptor` for HTTP request caching
- Enhanced `ProductController` with caching decorators

### Microservice Changes
- **Inventory Service**: Added caching to `getProductById()` and cache invalidation on updates
- **Customer Service**: Module updated with `RedisCacheModule`
- **Order Management**: Module updated with `RedisCacheModule`

## Cache Key Patterns
- `products:{id}` - Product details
- `products:list:{page}:{limit}` - Product lists
- `customers:{id}` - Customer details
- `inventory:{productId}` - Inventory details
- `inventory:stock:{productId}` - Stock levels
- `orders:{id}` - Order details
- `orders:customer:{customerId}` - Customer order lists

## TTL Values
- Product details: 5 minutes
- Product lists: 5 minutes
- Customer details: 10 minutes
- Inventory details: 30 seconds
- Stock levels: 15 seconds
- Order details: 1 minute
- Order lists: 30 seconds

## Usage Examples

### Service-level Caching
```typescript
async getProductById(productId: string): Promise<ProductDetails> {
  const cacheKey = CACHE_KEYS.PRODUCTS.DETAIL(productId);
  
  return this.cacheService.wrap(
    cacheKey,
    () => this.prisma.product.findUnique({ where: { id: productId } }),
    CACHE_TTL.PRODUCTS.DETAIL,
  );
}
```

### HTTP Request Caching
```typescript
@Get(':id')
@UseInterceptors(CacheInterceptor)
@CacheKey('product-detail')
@CacheTTL(CACHE_TTL.PRODUCTS.DETAIL)
async getProductById(@Param('id') id: string) {
  return this.productService.getProductById(id);
}
```

### Cache Invalidation
```typescript
async updateProduct(productId: string, dto: UpdateProductDto) {
  // Update database
  const product = await this.prisma.product.update({...});
  
  // Invalidate caches
  await this.invalidateProductCaches(productId);
  
  return product;
}
```

## Testing
Run cache tests:
```bash
yarn test test/cache.test.ts
```

## Performance Expectations
- Product List Response: ~150ms → ~15ms (90% improvement)
- Database Load: 100% → ~30% (70% reduction)
- Cache Hit Rate: >85%

## Next Steps
1. Implement cache invalidation events via RabbitMQ
2. Add cache monitoring and metrics
3. Implement cache warming strategies
4. Add cache analytics dashboard
