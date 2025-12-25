# Testing Strategy

## 1. Tổng quan

Tài liệu này mô tả chiến lược testing cho caching implementation, bao gồm unit tests, integration tests, và performance tests.

## 2. Unit Tests

### 2.1. Cache Service Tests

```typescript
// libs/common/cache/__tests__/cache.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from '../cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: any;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('get', () => {
    it('should return cached value on hit', async () => {
      const cachedValue = { id: '1', name: 'Product 1' };
      cacheManager.get.mockResolvedValue(cachedValue);

      const result = await service.get('products:1');

      expect(result).toEqual(cachedValue);
      expect(cacheManager.get).toHaveBeenCalledWith('products:1');
    });

    it('should return null on miss', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.get('products:nonexistent');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      cacheManager.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.get('products:1');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value with TTL', async () => {
      cacheManager.set.mockResolvedValue(undefined);

      await service.set('products:1', { name: 'Product 1' }, 60000);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'products:1',
        { name: 'Product 1' },
        60000,
      );
    });
  });

  describe('wrap', () => {
    it('should return cached value without calling factory', async () => {
      const cachedValue = { id: '1', name: 'Cached Product' };
      cacheManager.get.mockResolvedValue(cachedValue);
      const factory = jest.fn();

      const result = await service.wrap('products:1', factory, 60000);

      expect(result).toEqual(cachedValue);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result on miss', async () => {
      const freshValue = { id: '1', name: 'Fresh Product' };
      cacheManager.get.mockResolvedValue(undefined);
      const factory = jest.fn().mockResolvedValue(freshValue);

      const result = await service.wrap('products:1', factory, 60000);

      expect(result).toEqual(freshValue);
      expect(factory).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith('products:1', freshValue, 60000);
    });
  });
});
```

### 2.2. Cache Invalidation Tests

```typescript
// libs/common/cache/__tests__/cache-invalidation.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheInvalidationService } from '../cache-invalidation.service';

describe('CacheInvalidationService', () => {
  let service: CacheInvalidationService;
  let cacheManager: any;

  beforeEach(async () => {
    const mockCacheManager = {
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInvalidationService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheInvalidationService>(CacheInvalidationService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('invalidate', () => {
    it('should invalidate product caches on PRODUCT_UPDATED', async () => {
      await service.invalidate({
        type: 'PRODUCT_UPDATED',
        productId: 'product-123',
      });

      expect(cacheManager.del).toHaveBeenCalledWith('products:product-123');
      expect(cacheManager.del).toHaveBeenCalledWith('inventory:product-123');
    });

    it('should invalidate order caches on ORDER_CREATED', async () => {
      await service.invalidate({
        type: 'ORDER_CREATED',
        customerId: 'customer-123',
        productIds: ['product-1', 'product-2'],
      });

      expect(cacheManager.del).toHaveBeenCalledWith('orders:customer:customer-123');
      expect(cacheManager.del).toHaveBeenCalledWith('inventory:product-1');
      expect(cacheManager.del).toHaveBeenCalledWith('inventory:product-2');
    });
  });
});
```

## 3. Integration Tests

### 3.1. Cache với Redis

```typescript
// test/cache-integration.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Cache Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /products', () => {
    it('should return cached response on second request', async () => {
      // First request - cache miss
      const firstResponse = await request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200);

      expect(firstResponse.headers['x-cache']).toBe('MISS');

      // Second request - cache hit
      const secondResponse = await request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200);

      expect(secondResponse.headers['x-cache']).toBe('HIT');
      expect(secondResponse.body).toEqual(firstResponse.body);
    });

    it('should invalidate cache after product update', async () => {
      // Get initial cached response
      await request(app.getHttpServer()).get('/api/v1/products');

      // Update a product
      await request(app.getHttpServer())
        .put('/api/v1/products/test-id')
        .send({ name: 'Updated Product' });

      // Next request should be cache miss
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200);

      expect(response.headers['x-cache']).toBe('MISS');
    });
  });
});
```

## 4. Test Commands

```bash
# Run unit tests
yarn test libs/common/cache

# Run integration tests
yarn test:e2e test/cache-integration.e2e-spec.ts

# Run with coverage
yarn test:cov libs/common/cache

# Watch mode
yarn test:watch libs/common/cache
```

Xem [08-deployment.md](./08-deployment.md) để biết cách deploy.

