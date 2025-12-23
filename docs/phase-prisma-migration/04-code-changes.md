# 04. Code Changes Details

## 1. Package.json
Thêm:
```json
"dependencies": {
  "@prisma/client": "^5.x"
},
"devDependencies": {
  "prisma": "^5.x"
}
```

## 2. Prisma Service (`libs/common/src/database/prisma.service.ts`)
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

## 3. Order Management Service Refactor
Ví dụ: `createOrder`

**Trước (TypeORM):**
```typescript
const order = this.orderRepository.create(createOrderDto);
await this.orderRepository.save(order);
```

**Sau (Prisma):**
```typescript
const order = await this.prisma.order.create({
  data: {
    ...createOrderDto,
    line_items: {
      create: createOrderDto.items.map(item => ({ ... }))
    }
  }
});
```

## 4. Environment Variables
Cần đảm bảo `DIRECT_URL` có dạng `postgres://...` (không qua pooler) và `DATABASE_URL` có thể qua pooler (cho app) hoặc giống nhau nếu dev.
Neon yêu cầu `DIRECT_URL` cho operations like migration.
