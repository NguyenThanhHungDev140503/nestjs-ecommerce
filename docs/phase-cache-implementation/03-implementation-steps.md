# Các bước Triển khai Caching

## Tổng quan

Tài liệu này mô tả chi tiết các bước triển khai caching cho dự án NestJS E-commerce.

## Phase 1: Infrastructure Setup

### Bước 1.1: Cài đặt Dependencies

```bash
# Thêm các packages cần thiết
yarn add @nestjs/cache-manager cache-manager cache-manager-redis-yet keyv @keyv/redis
```

### Bước 1.2: Cập nhật package.json

```json
{
  "dependencies": {
    "@nestjs/cache-manager": "^3.0.0",
    "cache-manager": "^6.0.0",
    "cache-manager-redis-yet": "^5.0.0",
    "@keyv/redis": "^3.0.0",
    "keyv": "^5.0.0"
  }
}
```

### Bước 1.3: Cập nhật docker-compose.yml

```yaml
version: '3.8'
services:
  # ... existing services ...

  redis:
    image: redis:7-alpine
    container_name: ecommerce-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - ecommerce-network

volumes:
  redis_data:

networks:
  ecommerce-network:
    driver: bridge
```

### Bước 1.4: Cập nhật Environment Variables

```env
# .env.development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL=60000
CACHE_MAX_SIZE=100
```

## Phase 2: Cache Module trong libs/common

### Bước 2.1: Tạo cấu trúc thư mục

```
libs/common/
├── cache/
│   ├── index.ts
│   ├── cache.module.ts
│   ├── cache.service.ts
│   ├── cache.constants.ts
│   ├── decorators/
│   │   └── index.ts
│   └── interceptors/
│       └── index.ts
```

### Bước 2.2: Tạo Cache Module

File: `libs/common/cache/cache.module.ts`
(Xem chi tiết code trong 04-code-examples.md)

### Bước 2.3: Tạo Cache Service

File: `libs/common/cache/cache.service.ts`
(Xem chi tiết code trong 04-code-examples.md)

### Bước 2.4: Tạo Cache Constants

File: `libs/common/cache/cache.constants.ts`
(Xem chi tiết code trong 04-code-examples.md)

### Bước 2.5: Export từ libs/common

```typescript
// libs/common/index.ts
// ... existing exports ...

// Cache
export * from './cache';
```

## Phase 3: API Gateway Integration

### Bước 3.1: Import Cache Module

```typescript
// apps/api-gateway/src/api-gateway.module.ts
import { RedisCacheModule } from 'libs/common/cache';

@Module({
  imports: [
    RedisCacheModule,
    // ... other imports
  ],
})
export class ApiGatewayModule {}
```

### Bước 3.2: Tạo HTTP Cache Interceptor

File: `apps/api-gateway/src/interceptors/http-cache.interceptor.ts`
(Xem chi tiết code trong 04-code-examples.md)

### Bước 3.3: Áp dụng vào Controllers

```typescript
// apps/api-gateway/src/product/product.controller.ts
@Controller('products')
@UseInterceptors(HttpCacheInterceptor)
export class ProductController {
  // ...
}
```

## Phase 4: Microservice Caching

### Bước 4.1: Import Cache Module vào Services

```typescript
// apps/inventory-service/src/inventory-service.module.ts
import { RedisCacheModule } from 'libs/common/cache';

@Module({
  imports: [
    RedisCacheModule,
    // ... other imports
  ],
})
export class InventoryServiceModule {}
```

### Bước 4.2: Sử dụng Cache trong Service

```typescript
// apps/inventory-service/src/inventory-service.service.ts
import { CacheService, CACHE_KEYS, CACHE_TTL } from 'libs/common/cache';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getProductById(productId: string) {
    return this.cacheService.wrap(
      CACHE_KEYS.PRODUCTS.DETAIL(productId),
      () => this.prisma.product.findUnique({ where: { id: productId } }),
      CACHE_TTL.PRODUCTS.DETAIL,
    );
  }
}
```

## Phase 5: Cache Invalidation

### Bước 5.1: Tạo Invalidation Service

File: `libs/common/cache/cache-invalidation.service.ts`
(Xem chi tiết code trong 05-cache-invalidation.md)

### Bước 5.2: Kết nối với RabbitMQ Events

```typescript
// Emit invalidation event khi data thay đổi
@EventPattern('CACHE_INVALIDATE')
async handleCacheInvalidation(event: InvalidationEvent) {
  await this.cacheInvalidationService.invalidate(event);
}
```

## Checklist Triển khai

- [ ] Phase 1: Infrastructure
  - [ ] Cài đặt dependencies
  - [ ] Cập nhật docker-compose.yml
  - [ ] Cập nhật environment variables
  - [ ] Test Redis connection

- [ ] Phase 2: Cache Module
  - [ ] Tạo cache.module.ts
  - [ ] Tạo cache.service.ts
  - [ ] Tạo cache.constants.ts
  - [ ] Export từ libs/common

- [ ] Phase 3: API Gateway
  - [ ] Import RedisCacheModule
  - [ ] Tạo HTTP Cache Interceptor
  - [ ] Áp dụng vào controllers
  - [ ] Test caching

- [ ] Phase 4: Microservices
  - [ ] Import vào inventory-service
  - [ ] Import vào customer-service
  - [ ] Import vào order-management
  - [ ] Test microservice caching

- [ ] Phase 5: Invalidation
  - [ ] Tạo invalidation service
  - [ ] Kết nối events
  - [ ] Test invalidation

Xem [04-code-examples.md](./04-code-examples.md) để biết chi tiết code.

