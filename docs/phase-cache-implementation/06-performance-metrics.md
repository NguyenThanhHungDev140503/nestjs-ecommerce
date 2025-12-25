# Performance Metrics

## 1. Tổng quan

Tài liệu này định nghĩa các metrics cần theo dõi để đánh giá hiệu quả của caching implementation.

## 2. Key Performance Indicators (KPIs)

### 2.1. Cache Metrics

| Metric | Mô tả | Target |
|--------|-------|--------|
| Cache Hit Rate | Tỷ lệ request được serve từ cache | > 80% |
| Cache Miss Rate | Tỷ lệ request phải query database | < 20% |
| Average Cache Latency | Thời gian trung bình để đọc từ cache | < 5ms |
| Cache Memory Usage | Memory sử dụng bởi cache | < 80% allocated |
| Cache Eviction Rate | Tỷ lệ keys bị evict do memory | < 5% |

### 2.2. Response Time Metrics

| Endpoint | Trước Cache | Sau Cache | Target |
|----------|-------------|-----------|--------|
| GET /products | ~150ms | ~15ms | < 50ms |
| GET /products/:id | ~50ms | ~5ms | < 20ms |
| GET /customers/:id | ~40ms | ~5ms | < 20ms |
| GET /orders | ~100ms | ~20ms | < 50ms |
| GET /orders/:id | ~60ms | ~10ms | < 30ms |

### 2.3. Database Load Metrics

| Metric | Trước Cache | Sau Cache | Improvement |
|--------|-------------|-----------|-------------|
| Queries per second | 500 | 150 | 70% giảm |
| Connection pool usage | 80% | 30% | 62% giảm |
| Average query time | 50ms | 50ms | N/A |

## 3. Prometheus Metrics Implementation

### 3.1. Custom Metrics Service

```typescript
// libs/common/cache/cache-metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

@Injectable()
export class CacheMetricsService {
  private readonly registry: Registry;
  private readonly cacheHits: Counter;
  private readonly cacheMisses: Counter;
  private readonly cacheLatency: Histogram;
  private readonly cacheSize: Gauge;

  constructor() {
    this.registry = new Registry();

    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_key_prefix'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_key_prefix'],
      registers: [this.registry],
    });

    this.cacheLatency = new Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Duration of cache operations in seconds',
      labelNames: ['operation', 'cache_key_prefix'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.cacheSize = new Gauge({
      name: 'cache_keys_count',
      help: 'Number of keys in cache',
      labelNames: ['cache_store'],
      registers: [this.registry],
    });
  }

  recordHit(keyPrefix: string): void {
    this.cacheHits.inc({ cache_key_prefix: keyPrefix });
  }

  recordMiss(keyPrefix: string): void {
    this.cacheMisses.inc({ cache_key_prefix: keyPrefix });
  }

  recordLatency(operation: string, keyPrefix: string, durationMs: number): void {
    this.cacheLatency.observe(
      { operation, cache_key_prefix: keyPrefix },
      durationMs / 1000,
    );
  }

  updateCacheSize(store: string, count: number): void {
    this.cacheSize.set({ cache_store: store }, count);
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
```

### 3.2. Tích hợp vào Cache Service

```typescript
// libs/common/cache/cache.service.ts (updated)
async get<T>(key: string): Promise<T | null> {
  const startTime = Date.now();
  const keyPrefix = key.split(':')[0];

  try {
    const value = await this.cacheManager.get<T>(key);
    const duration = Date.now() - startTime;

    if (value) {
      this.metricsService.recordHit(keyPrefix);
      this.metricsService.recordLatency('get', keyPrefix, duration);
      this.logger.debug(`Cache HIT: ${key} (${duration}ms)`);
    } else {
      this.metricsService.recordMiss(keyPrefix);
      this.logger.debug(`Cache MISS: ${key}`);
    }

    return value ?? null;
  } catch (error) {
    this.logger.error(`Cache GET error: ${key}`, error.message);
    return null;
  }
}
```

## 4. Grafana Dashboard Queries

### 4.1. Cache Hit Rate

```promql
sum(rate(cache_hits_total[5m])) / 
(sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m]))) * 100
```

### 4.2. Cache Latency (p95)

```promql
histogram_quantile(0.95, 
  sum(rate(cache_operation_duration_seconds_bucket[5m])) by (le, operation)
)
```

### 4.3. Cache Miss Rate by Key Prefix

```promql
sum(rate(cache_misses_total[5m])) by (cache_key_prefix) /
sum(rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) by (cache_key_prefix) * 100
```

## 5. Benchmarking

### 5.1. Load Testing với k6

```javascript
// k6-cache-benchmark.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<50'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Test cached endpoint
  const res = http.get('http://localhost:3000/api/v1/products');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 50ms': (r) => r.timings.duration < 50,
  });

  sleep(0.1);
}
```

### 5.2. Chạy Benchmark

```bash
# Chạy k6 load test
k6 run k6-cache-benchmark.js

# Output expected:
# ✓ status is 200
# ✓ response time < 50ms
# http_req_duration: avg=15ms p(95)=25ms
```

## 6. Expected Results

| Phase | Cache Hit Rate | Avg Response Time | Database Load |
|-------|----------------|-------------------|---------------|
| Week 1 | 60% | 40ms | 60% reduction |
| Week 2 | 75% | 25ms | 70% reduction |
| Week 4 | 85% | 15ms | 80% reduction |
| Stable | 90%+ | <10ms | 85%+ reduction |

Xem [07-testing-strategy.md](./07-testing-strategy.md) để biết cách test caching.

