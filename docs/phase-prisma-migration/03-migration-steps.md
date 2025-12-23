# 03. Migration Steps

## 1. Preparation
- [ ] Cài đặt dependencies: `npm install prisma @prisma/client`
- [ ] Init Prisma: `npx prisma init`
- [ ] Cập nhật `.env`: Thêm `DIRECT_URL` (cho Neon).

## 2. Schema Setup
- [ ] Copy nội dung schema từ `02-prisma-schema.md` vào `prisma/schema.prisma`.
- [ ] Generate Prisma Client: `npx prisma generate`.

## 3. Database Migration
- [ ] Tạo migration đầu tiên (nếu là DB mới hoặc muốn reset):
  ```bash
  npx prisma migrate dev --name init_schema
  ```
- [ ] Nếu DB đã có data và muốn giữ lại (Introspection - Optional nhưng rủi ro nếu schema không khớp hoàn toàn, tốt nhất là backup và migrate dev nếu dev env):
  - Do đang trong giai đoạn dev và cấu trúc đơn giản, ta sẽ dùng `migrate dev` để đồng bộ structure.

## 4. Code Integration
- [ ] Tạo `PrismaService` (extends `PrismaClient` + `onModuleInit`).
- [ ] Tạo `PrismaModule` (global hoặc per-module) trong `libs/common`.
- [ ] Inject `PrismaService` vào `OrderManagementService`.
- [ ] Thay thế các gọi `Repository` bằng `prisma.order.create`, `prisma.order.findMany`, v.v.

## 5. Cleanup
- [ ] Xóa TypeORM config và dependencies.
- [ ] Xóa các file `.entity.ts`.
