# 02. Prisma Schema Design

## Configuration

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Quan trọng cho Neon DB
}
```

## Enums

```prisma
enum OrderStatus {
  PROCESSING
  CANCELLED
  DELIVERED
}
```

## Models

### Order (đổi tên table thành `order` để match convention cũ hoặc đặt map)

```prisma
model Order {
  id               String          @id @default(uuid())
  status           OrderStatus     @default(PROCESSING)
  shipping_address String
  created_at       DateTime        @default(now())
  updated_at       DateTime        @updatedAt
  tracking_company String?
  tracking_number  String?
  customer_id      String
  total_amount     Decimal         @db.Decimal(10, 2)
  
  // Relations
  line_items       OrderLineItem[]

  @@map("order") // Mapping tới tên bảng cũ nếu cần giữ nguyên, hoặc theo convention Prisma
}
```

### Product (Local cache hoặc reference)

```prisma
model Product {
  id                 String          @id @default(uuid())
  name               String
  unit_price         Decimal         @db.Decimal(10, 2)
  available_quantity Decimal         @db.Decimal(10, 2) // Hoặc Int tùy logic
  description        String?         @db.Text
  created_at         DateTime        @default(now())
  updated_at         DateTime        @updatedAt
  
  // Relations
  line_items         OrderLineItem[]

  @@map("product")
}
```

### OrderLineItem

```prisma
model OrderLineItem {
  id         String   @id @default(uuid())
  order_id   String
  product_id String
  quantity   Int
  unit_price Decimal  @db.Decimal(10, 2)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  
  // Relations
  order   Order   @relation(fields: [order_id], references: [id], onDelete: Cascade) // Hoặc Restrict tùy business logic
  product Product @relation(fields: [product_id], references: [id])

  @@map("order_line_item")
}
```
