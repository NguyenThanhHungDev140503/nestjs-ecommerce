# Deployment Guide

## 1. Tổng quan

Tài liệu này hướng dẫn cách deploy caching infrastructure cho các môi trường khác nhau.

## 2. Local Development

### 2.1. Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  # Existing services...
  api-gateway:
    build:
      context: .
      dockerfile: Dockerfile.api-gateway
    ports:
      - '3000:3000'
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      redis:
        condition: service_healthy
      rmq:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    container_name: ecommerce-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  redis_data:
```

### 2.2. Start Services

```bash
# Start all services including Redis
docker-compose up -d

# Check Redis health
docker-compose exec redis redis-cli ping
# Expected: PONG

# View Redis logs
docker-compose logs -f redis
```

## 3. Staging Environment

### 3.1. Redis Configuration

```yaml
# docker-compose.staging.yml
services:
  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --appendonly yes
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    volumes:
      - redis_staging_data:/data
    deploy:
      resources:
        limits:
          memory: 768M
        reservations:
          memory: 512M
```

### 3.2. Environment Variables

```env
# .env.staging
NODE_ENV=staging
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_staging_password
REDIS_DB=0
CACHE_TTL=120000
```

## 4. Production Environment

### 4.1. Redis Cluster (Recommended)

```yaml
# k8s/redis-cluster.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
data:
  redis.conf: |
    maxmemory 2gb
    maxmemory-policy allkeys-lru
    appendonly yes
    appendfsync everysec
    auto-aof-rewrite-percentage 100
    auto-aof-rewrite-min-size 64mb
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command: ["redis-server", "/etc/redis/redis.conf"]
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-config
          mountPath: /etc/redis
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          exec:
            command: ["redis-cli", "ping"]
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["redis-cli", "ping"]
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: redis-config
        configMap:
          name: redis-config
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  clusterIP: None
```

### 4.2. Production Environment Variables

```env
# .env.production
NODE_ENV=production
REDIS_HOST=redis-service
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_DB=0
CACHE_TTL=300000
CACHE_MAX_SIZE=500
```

## 5. AWS ElastiCache (Alternative)

### 5.1. Terraform Configuration

```hcl
# terraform/elasticache.tf
resource "aws_elasticache_cluster" "ecommerce" {
  cluster_id           = "ecommerce-cache"
  engine               = "redis"
  node_type            = "cache.r6g.large"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379

  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  snapshot_retention_limit = 7
  snapshot_window          = "05:00-09:00"
  maintenance_window       = "sun:05:00-sun:09:00"

  tags = {
    Environment = "production"
    Application = "ecommerce"
  }
}
```

## 6. Deployment Checklist

- [ ] Redis service deployed and healthy
- [ ] Environment variables configured
- [ ] Network connectivity verified
- [ ] Memory limits set appropriately
- [ ] Persistence configured (AOF/RDB)
- [ ] Monitoring setup (see 09-monitoring.md)
- [ ] Backup strategy implemented
- [ ] Application services restarted

Xem [09-monitoring.md](./09-monitoring.md) để biết cách monitoring.

