# Kiến trúc Cache

## 1. Tổng quan Kiến trúc

### 1.1. Multi-Layer Caching Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT REQUESTS                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (port 3000)                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    HTTP Cache Interceptor                          │  │
│  │              (Auto-cache GET requests by URL)                      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│         ┌──────────────────────────┼──────────────────────────┐         │
│         ▼                          ▼                          ▼         │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐   │
│  │  Products   │           │  Customers  │           │   Orders    │   │
│  │ Controller  │           │ Controller  │           │ Controller  │   │
│  └─────────────┘           └─────────────┘           └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
         │                          │                          │
         │                   RabbitMQ Messages                 │
         ▼                          ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        MICROSERVICES LAYER                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │  Inventory  │    │  Customer   │    │    Order    │                  │
│  │   Service   │    │   Service   │    │   Service   │                  │
│  │ ┌─────────┐ │    │ ┌─────────┐ │    │ ┌─────────┐ │                  │
│  │ │ Cache   │ │    │ │ Cache   │ │    │ │ Cache   │ │                  │
│  │ │ Layer   │ │    │ │ Layer   │ │    │ │ Layer   │ │                  │
│  │ └─────────┘ │    │ └─────────┘ │    │ └─────────┘ │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          CACHE LAYER                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    L1: In-Memory Cache (Keyv)                      │ │
│  │                    - Per-instance cache                            │ │
│  │                    - Ultra-fast access (~1ms)                      │ │
│  │                    - Limited size (100MB default)                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                              Cache Miss                                  │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    L2: Redis Cluster                               │ │
│  │                    - Distributed cache                             │ │
│  │                    - Shared across instances                       │ │
│  │                    - Persistent (AOF enabled)                      │ │
│  │                    - Access time (~5-10ms)                         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                              Cache Miss
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                                   │
│                    PostgreSQL (Neon Serverless)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. Cache Key Design

### 2.1. Key Naming Convention

```
{service}:{entity}:{operation}:{identifier}:{params}
```

**Ví dụ:**
- `inventory:products:list:page=1:limit=10`
- `inventory:products:detail:abc123`
- `customer:customers:detail:user456`
- `order:orders:list:customer=user456`

### 2.2. Key Structure

| Service | Key Pattern | Example |
|---------|-------------|---------|
| Inventory | `products:list:{page}:{limit}` | `products:list:1:10` |
| Inventory | `products:{id}` | `products:abc123` |
| Inventory | `inventory:{productId}` | `inventory:abc123` |
| Customer | `customers:{id}` | `customers:user456` |
| Order | `orders:{id}` | `orders:order789` |
| Order | `orders:customer:{customerId}` | `orders:customer:user456` |

## 3. TTL Strategy

### 3.1. TTL by Data Type

| Data Type | TTL | Lý do |
|-----------|-----|-------|
| Product List | 5 phút | Ít thay đổi, query thường xuyên |
| Product Detail | 5 phút | Ít thay đổi |
| Customer Detail | 10 phút | Rất ít thay đổi |
| Inventory Stock | 30 giây | Thay đổi khi đặt hàng |
| Order List | 30 giây | Thay đổi thường xuyên |
| Order Detail | 1 phút | Cần cập nhật status |

### 3.2. Dynamic TTL

```typescript
// TTL dựa trên loại user
const getTTL = (context: ExecutionContext): number => {
  const request = context.switchToHttp().getRequest();
  const user = request.user;
  
  // Premium users get fresher data
  if (user?.isPremium) {
    return 30000; // 30 seconds
  }
  
  return 300000; // 5 minutes
};
```

## 4. Cache Stores Configuration

### 4.1. L1: In-Memory (Keyv)

```typescript
const memoryStore = new Keyv({
  namespace: 'ecommerce',
  ttl: 60000, // 1 minute default
});
```

### 4.2. L2: Redis

```typescript
const redisStore = await redisStore({
  socket: {
    host: 'localhost',
    port: 6379,
  },
  ttl: 300000, // 5 minutes default
});
```

## 5. Diagram Flow

### 5.1. Cache Read Flow

```
Request → L1 Check → HIT → Return
              ↓
            MISS
              ↓
         L2 Check → HIT → Store L1 → Return
              ↓
            MISS
              ↓
         Database → Store L2 → Store L1 → Return
```

### 5.2. Cache Write/Invalidation Flow

```
Write Request → Update Database → Invalidate L1 → Invalidate L2 → Response
```

Xem [03-implementation-steps.md](./03-implementation-steps.md) để biết chi tiết các bước triển khai.

