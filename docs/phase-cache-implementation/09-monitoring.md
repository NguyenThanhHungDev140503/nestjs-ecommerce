# Monitoring & Maintenance

## 1. Tổng quan

Tài liệu này mô tả cách monitoring và bảo trì caching system cho dự án e-commerce.

## 2. Redis Monitoring

### 2.1. Redis Exporter cho Prometheus

```yaml
# docker-compose.monitoring.yml
services:
  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: redis-exporter
    ports:
      - '9121:9121'
    environment:
      - REDIS_ADDR=redis://redis:6379
    depends_on:
      - redis
```

### 2.2. Key Redis Metrics

| Metric | Prometheus Query | Alert Threshold |
|--------|------------------|-----------------|
| Memory Usage | `redis_memory_used_bytes / redis_memory_max_bytes * 100` | > 80% |
| Hit Rate | `redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)` | < 70% |
| Connected Clients | `redis_connected_clients` | > 1000 |
| Blocked Clients | `redis_blocked_clients` | > 10 |
| Evicted Keys | `rate(redis_evicted_keys_total[5m])` | > 100/min |

### 2.3. Prometheus Alerts

```yaml
# prometheus/alerts/redis.yml
groups:
  - name: redis
    rules:
      - alert: RedisHighMemoryUsage
        expr: redis_memory_used_bytes / redis_memory_max_bytes * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage is high"
          description: "Redis memory usage is {{ $value }}%"

      - alert: RedisLowHitRate
        expr: |
          redis_keyspace_hits_total / 
          (redis_keyspace_hits_total + redis_keyspace_misses_total) * 100 < 70
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Redis cache hit rate is low"
          description: "Cache hit rate is {{ $value }}%"

      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"
          description: "Redis instance is not responding"

      - alert: RedisTooManyConnections
        expr: redis_connected_clients > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Too many Redis connections"
          description: "{{ $value }} clients connected"
```

## 3. Application-level Monitoring

### 3.1. Cache Health Endpoint

```typescript
// apps/api-gateway/src/health/cache-health.indicator.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { CacheService } from 'libs/common/cache';

@Injectable()
export class CacheHealthIndicator extends HealthIndicator {
  constructor(private readonly cacheService: CacheService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const testKey = '__health_check__';
    
    try {
      await this.cacheService.set(testKey, 'ok', 5000);
      const value = await this.cacheService.get(testKey);
      
      if (value === 'ok') {
        return this.getStatus(key, true, { status: 'connected' });
      }
      
      throw new Error('Cache read/write failed');
    } catch (error) {
      throw new HealthCheckError(
        'Cache check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }
}
```

### 3.2. Health Controller

```typescript
// apps/api-gateway/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { CacheHealthIndicator } from './cache-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private cacheHealth: CacheHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.cacheHealth.isHealthy('cache'),
    ]);
  }
}
```

## 4. Grafana Dashboard

### 4.1. Dashboard JSON

```json
{
  "title": "E-commerce Cache Monitoring",
  "panels": [
    {
      "title": "Cache Hit Rate",
      "type": "gauge",
      "targets": [
        {
          "expr": "sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m]))) * 100"
        }
      ]
    },
    {
      "title": "Cache Operations/sec",
      "type": "graph",
      "targets": [
        { "expr": "sum(rate(cache_hits_total[1m]))", "legendFormat": "Hits" },
        { "expr": "sum(rate(cache_misses_total[1m]))", "legendFormat": "Misses" }
      ]
    },
    {
      "title": "Redis Memory Usage",
      "type": "graph",
      "targets": [
        { "expr": "redis_memory_used_bytes / 1024 / 1024", "legendFormat": "Used MB" }
      ]
    }
  ]
}
```

## 5. Maintenance Tasks

### 5.1. Scheduled Tasks

```typescript
// libs/common/cache/cache-maintenance.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from './cache.service';

@Injectable()
export class CacheMaintenanceService {
  private readonly logger = new Logger(CacheMaintenanceService.name);

  constructor(private readonly cacheService: CacheService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredKeys() {
    this.logger.log('Running cache cleanup...');
    // Redis handles TTL automatically, but we can do custom cleanup
  }

  @Cron(CronExpression.EVERY_HOUR)
  async warmupCache() {
    this.logger.log('Running cache warmup...');
    // Pre-populate frequently accessed data
  }
}
```

### 5.2. Manual Maintenance Commands

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Check memory usage
INFO memory

# Get all keys matching pattern
KEYS products:*

# Delete keys by pattern (use with caution)
redis-cli KEYS "products:list:*" | xargs redis-cli DEL

# Flush entire cache (DANGEROUS in production)
FLUSHALL
```

## 6. Troubleshooting

### 6.1. Common Issues

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| High memory usage | Too many keys, large values | Adjust TTL, implement eviction |
| Low hit rate | Short TTL, poor key design | Review TTL strategy, optimize keys |
| Connection errors | Network issues, max connections | Check network, increase limits |
| Slow operations | Large values, complex operations | Optimize data size, use pipelining |

### 6.2. Debug Commands

```bash
# Monitor real-time commands
redis-cli MONITOR

# Check slow log
redis-cli SLOWLOG GET 10

# Check client list
redis-cli CLIENT LIST
```

## 7. Backup & Recovery

### 7.1. Backup Strategy

```bash
# Manual backup
docker-compose exec redis redis-cli BGSAVE

# Copy RDB file
docker cp ecommerce-redis:/data/dump.rdb ./backups/

# Restore from backup
docker cp ./backups/dump.rdb ecommerce-redis:/data/
docker-compose restart redis
```

---

**Hoàn thành documentation cho Phase Cache Implementation.**

