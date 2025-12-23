# 01. Phân tích hiện trạng (TypeORM)

## Hiện trạng
- **ORM**: TypeORM v0.3.x
- **Database**: PostgreSQL (Neon Database)
- **Entities**:
  - `Order`
  - `OrderLineItem`
  - `Product` (Quản lý local trong Order Service đại diện cho sản phẩm đã đặt?)

## TypeORM Entities Analysis

### Order Entity
- Properties:
  - `id`: UUID
  - `status`: Enum (PROCESSING, CANCELLED, DELIVERED)
  - `shipping_address`: String
  - `created_at`: Date
  - `updated_at`: Date
  - `failed_attempts`: (Có thể có trong logic retry nhưng chưa thấy trong entities gốc, cần kiểm tra lại code)
  
### Mối quan hệ
- `Order` 1-n `OrderLineItem`

## Vấn đề với TypeORM hiện tại
- `synchronize: true`: Rủi ro cho production.
- Migration management: Phức tạp hơn so với Prisma Migrate.
- Type safety: TypeORM trả về `any` hoặc partial types trong một số query builder complex, Prisma generate type cụ thể cho từng query.

## Mapping sang Prisma

| TypeORM | Prisma | Ghi chú |
|---------|--------|---------|
| `@Entity()` | `model` | |
| `@PrimaryGeneratedColumn('uuid')` | `@id @default(uuid())` | |
| `@Column()` | type tương ứng | |
| `@CreateDateColumn()` | `@default(now())` | |
| `@UpdateDateColumn()` | `@updatedAt` | |
| `@OneToMany` | Relation field `[]` | |
| `@ManyToOne` | Relation field + foreign key | |
