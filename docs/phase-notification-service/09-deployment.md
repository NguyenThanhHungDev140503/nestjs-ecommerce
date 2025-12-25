# Deployment và Monitoring

## Tổng quan
Tài liệu này mô tả chi tiết quy trình deployment và monitoring cho Notification Service, bao gồm các môi trường khác nhau và chiến lược monitoring.

## Deployment Environments

### 1. Development Environment
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  notification-service:
    build:
      context: .
      dockerfile: Dockerfile.dev
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/notification_dev
      - REDIS_URL=redis://redis:6379/1
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - NOVU_API_KEY=${NOVU_API_KEY}
    ports:
      - "3004:3000"
      - "9229:9229" # Debug port
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis
      - rabbitmq
    command: npm run start:dev

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=notification_dev
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_dev_data:/data
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      - RABBITMQ_DEFAULT_USER=guest
      - RABBITMQ_DEFAULT_PASS=guest
    volumes:
      - rabbitmq_dev_data:/var/lib/rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"

volumes:
  postgres_dev_data:
  redis_dev_data:
  rabbitmq_dev_data:
```

### 2. Staging Environment
```yaml
# docker-compose.staging.yml
version: '3.8'

services:
  notification-service:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=${STAGING_DATABASE_URL}
      - REDIS_URL=${STAGING_REDIS_URL}
      - RABBITMQ_URL=${STAGING_RABBITMQ_URL}
      - NOVU_API_KEY=${STAGING_NOVU_API_KEY}
      - LOG_LEVEL=info
      - PROMETHEUS_ENABLED=true
    ports:
      - "3004:3000"
    depends_on:
      - postgres
      - redis
      - rabbitmq
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=${STAGING_DB_NAME}
      - POSTGRES_USER=${STAGING_DB_USER}
      - POSTGRES_PASSWORD=${STAGING_DB_PASSWORD}
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_staging_data:/data
    restart: unless-stopped

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      - RABBITMQ_DEFAULT_USER=${STAGING_RABBITMQ_USER}
      - RABBITMQ_DEFAULT_PASS=${STAGING_RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq_staging_data:/var/lib/rabbitmq
    restart: unless-stopped

volumes:
  postgres_staging_data:
  redis_staging_data:
  rabbitmq_staging_data:
```

### 3. Production Environment
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  notification-service:
    image: your-registry/notification-service:1.0.0
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${PROD_DATABASE_URL}
      - REDIS_URL=${PROD_REDIS_URL}
      - RABBITMQ_URL=${PROD_RABBITMQ_URL}
      - NOVU_API_KEY=${PROD_NOVU_API_KEY}
      - LOG_LEVEL=warn
      - PROMETHEUS_ENABLED=true
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
      - rabbitmq
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - notification-service
    restart: unless-stopped

volumes:
  postgres_prod_data:
  redis_prod_data:
  rabbitmq_prod_data:
```

## Kubernetes Deployment

### 1. Namespace
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: notification-service
  labels:
    name: notification-service
    environment: production
```

### 2. ConfigMap
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: notification-config
  namespace: notification-service
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "warn"
  PROMETHEUS_ENABLED: "true"
  HEALTH_CHECK_PATH: "/health"
  METRICS_PATH: "/metrics"
```

### 3. Secret
```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: notification-secrets
  namespace: notification-service
type: Opaque
data:
  DATABASE_PASSWORD: <base64-encoded>
  REDIS_PASSWORD: <base64-encoded>
  NOVU_API_KEY: <base64-encoded>
  JWT_SECRET: <base64-encoded>
```

### 4. Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
  namespace: notification-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: notification-service
  template:
    metadata:
      labels:
        app: notification-service
    spec:
      containers:
      - name: notification-service
        image: your-registry/notification-service:1.0.0
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: notification-secrets
              key: DATABASE_PASSWORD
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: notification-secrets
              key: REDIS_PASSWORD
        - name: NOVU_API_KEY
          valueFrom:
            secretKeyRef:
              name: notification-secrets
              key: NOVU_API_KEY
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: config
          mountPath: /app/config
      volumes:
      - name: config
        configMap:
          name: notification-config
```

### 5. Service
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: notification-service
  namespace: notification-service
spec:
  selector:
    app: notification-service
  ports:
  - name: http
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### 6. Ingress
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: notification-service
  namespace: notification-service
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: notification-service-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: notification-service
            port:
              number: 80
```

## CI/CD Pipeline

### 1. GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy Notification Service

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/notification-service

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.image.outputs.image }}
      digest: ${{ steps.build.outputs.digest }}
    steps:
    - uses: actions/checkout@v3

    - name: Setup Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}

    - name: Build and push Docker image
      id: build
      uses: docker/build-push-action@v4
      with:
        context: .
        file: ./Dockerfile
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm run test:ci

    - name: Run security audit
      run: npm audit --audit-level moderate

  deploy-staging:
    needs: [build, test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
    - name: Deploy to staging
      run: |
        echo "Deploying to staging environment"
        # Add your staging deployment commands here

  deploy-production:
    needs: [build, test]
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    environment: production
    steps:
    - name: Deploy to production
      run: |
        echo "Deploying to production environment"
        # Add your production deployment commands here
```

### 2. Docker Build
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

## Monitoring

### 1. Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'notification-service'
    static_configs:
      - targets: ['notification-service:3000']
    metrics_path: /metrics
    scrape_interval: 10s
    scrape_timeout: 5s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'rabbitmq'
    static_configs:
      - targets: ['rabbitmq:15692']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### 2. Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Notification Service Dashboard",
    "panels": [
      {
        "title": "Notification Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(notifications_sent_total[5m])",
            "legendFormat": "{{channel}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(notification_errors_total[5m])",
            "legendFormat": "{{error_type}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(notification_send_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
```

### 3. Alerting Rules
```yaml
# monitoring/alert_rules.yml
groups:
  - name: notification_service_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(notification_errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High notification error rate"
          description: "Error rate is {{ $value }} errors per second"

      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker is open"
          description: "Circuit breaker for {{ $labels.provider }} is open"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(notification_send_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }} seconds"

      - alert: DatabaseConnectionFailure
        expr: up{job="notification-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Notification service is down"
          description: "Notification service has been down for more than 1 minute"
```

### 4. Health Checks
```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { NovuHealthIndicator } from './novu.health';
import { RedisHealthIndicator } from './redis.health';
import { RabbitMQHealthIndicator } from './rabbitmq.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private prismaHealth: PrismaHealthIndicator,
    private novuHealth: NovuHealthIndicator,
    private redisHealth: RedisHealthIndicator,
    private rabbitmqHealth: RabbitMQHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.novuHealth.isHealthy('novu'),
      () => this.redisHealth.isHealthy('redis'),
      () => this.rabbitmqHealth.isHealthy('rabbitmq'),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
    ]);
  }

  @Get('live')
  @HealthCheck()
  liveness() {
    return this.health.check([
      () => this.http.pingCheck('self', 'http://localhost:3000/health'),
    ]);
  }
}
```

### 5. Metrics Collection
```typescript
// src/metrics/metrics.controller.ts
import { Controller, Get } from '@nestjs/common';
import { PrometheusController } from '@nestjs/prometheus';

@Controller('metrics')
export class MetricsController extends PrometheusController {
  constructor() {
    super();
  }

  @Get()
  async getMetrics() {
    return this.metricsRegistry.metrics();
  }
}
```

## Logging

### 1. Structured Logging
```typescript
// src/utils/logger.ts
import { Logger } from '@nestjs/common';

export class NotificationLogger extends Logger {
  logNotificationSent(templateKey: string, channel: string, recipient: string) {
    this.log('Notification sent', {
      event: 'notification_sent',
      templateKey,
      channel,
      recipient,
      timestamp: new Date().toISOString(),
    });
  }

  logNotificationFailed(templateKey: string, channel: string, error: string) {
    this.error('Notification failed', {
      event: 'notification_failed',
      templateKey,
      channel,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  logWorkflowTrigger(templateKey: string, userId: string, payload: any) {
    this.log('Workflow triggered', {
      event: 'workflow_triggered',
      templateKey,
      userId,
      payload,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 2. Log Aggregation
```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  kibana:
    image: kibana:8.8.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  fluentd:
    build:
      context: ./fluentd
      dockerfile: Dockerfile
    volumes:
      - ./fluentd/conf:/fluentd/etc
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    ports:
      - "24224:24224"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

### 3. Log Configuration
```xml
<!-- fluentd/conf/fluentd.conf -->
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

<match notification-service.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name notification-service
  type_name _doc
  include_timestamp true
  
  <buffer>
    @type file
    path /var/log/fluentd-buffers/notification-service.buffer
    flush_mode interval
    retry_type exponential_backoff
    flush_thread_count 2
    flush_interval 5s
    retry_forever
    retry_max_interval 30
    chunk_limit_size 2M
    queue_limit_length 8
    overflow_action block
  </buffer>
</match>
```

## Performance Monitoring

### 1. Application Performance Monitoring
```typescript
// src/monitoring/apm.service.ts
import { Injectable } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class APMService {
  private readonly httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  });

  private readonly notificationLatency = new promClient.Histogram({
    name: 'notification_send_duration_seconds',
    help: 'Duration of notification sending in seconds',
    labelNames: ['channel', 'template'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  private readonly activeConnections = new promClient.Gauge({
    name: 'active_connections',
    help: 'Number of active connections',
    labelNames: ['type'],
  });

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration);
  }

  recordNotificationLatency(channel: string, template: string, duration: number) {
    this.notificationLatency.labels(channel, template).observe(duration);
  }

  updateActiveConnections(type: string, count: number) {
    this.activeConnections.labels(type).set(count);
  }
}
```

### 2. Database Monitoring
```sql
-- Database performance queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements 
WHERE mean_time > 100
ORDER BY mean_time DESC;

-- Connection usage
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_connections,
  count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;
```

## Backup và Recovery

### 1. Database Backup
```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
DATABASE_URL="postgresql://user:pass@host:5432/notification_db"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_DIR/notification_db_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/notification_db_$DATE.sql

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/notification_db_$DATE.sql.gz s3://your-backup-bucket/database/

# Clean up old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### 2. Redis Backup
```bash
#!/bin/bash
# backup-redis.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/redis"

# Create Redis backup
redis-cli --rdb $BACKUP_DIR/dump_$DATE.rdb

# Compress backup
gzip $BACKUP_DIR/dump_$DATE.rdb

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/dump_$DATE.rdb.gz s3://your-backup-bucket/redis/

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "*.rdb.gz" -mtime +7 -delete
```

### 3. Disaster Recovery Plan
```yaml
# disaster-recovery.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: disaster-recovery-plan
data:
  recovery_procedures: |
    # Database Recovery
    1. Stop notification service
    2. Restore database from latest backup
    3. Run database migrations
    4. Verify data integrity
    5. Start notification service
    
    # Redis Recovery
    1. Stop Redis service
    2. Restore Redis data from backup
    3. Start Redis service
    4. Verify Redis connectivity
    
    # Service Recovery
    1. Check service health
    2. Verify API endpoints
    3. Test notification sending
    4. Monitor error rates
    
    # Communication Plan
    - Notify stakeholders
    - Update status page
    - Document incident
    - Post-mortem analysis
```

## Security Considerations

### 1. Container Security
```dockerfile
# Dockerfile.secure
FROM node:18-alpine AS builder

# Install security updates
RUN apk update && apk upgrade

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Set file permissions
RUN chmod -R 755 /app

USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### 2. Network Security
```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: notification-service-netpol
  namespace: notification-service
spec:
  podSelector:
    matchLabels:
      app: notification-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
```

## Troubleshooting

### 1. Common Issues
- **High CPU usage**: Check for infinite loops or inefficient queries
- **Memory leaks**: Monitor heap usage and garbage collection
- **Database connection issues**: Check connection pool settings
- **Redis timeouts**: Monitor Redis performance and connection limits

### 2. Debug Commands
```bash
# Check service logs
kubectl logs -f deployment/notification-service -n notification-service

# Check resource usage
kubectl top pods -n notification-service

# Check database connections
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# Check Redis info
redis-cli info

# Monitor system resources
htop
iostat -x 1
```

### 3. Performance Tuning
- **Database**: Optimize queries, add indexes, tune connection pool
- **Redis**: Configure memory limits, enable persistence
- **Application**: Tune worker threads, adjust memory limits
- **Infrastructure**: Scale horizontally, use load balancers
