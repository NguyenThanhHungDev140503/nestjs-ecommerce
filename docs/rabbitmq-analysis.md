# Phân Tích Setup RabbitMQ trong `nestjs-ecommerce`

## 1. Cơ Sở Hạ Tầng (Infrastructure)

### docker-compose.yml
- **Service**: `rmq`
- **Image**: `rabbitmq:3-management`
- **Ports**: 
  - `5673:5672` (AMQP) - *Mapped ra host port 5673 để tránh conflict với local RabbitMQ mặc định*
  - `15673:15672` (Management UI)
- **Healthcheck**: Sử dụng `rabbitmq-diagnostics -q ping`.
- **Dependencies**: Các services (`api-gateway`, `order`, `inventory`, `customer`) đều `depends_on` `rmq` với condition `service_healthy`.

### Environment Variables (.env.development)
- `RABBITMQ_URL`: `amqp://guest:guest@rmq:5672`
- `RABBITMQ_ORDER_QUEUE`: `order-queue`
- `RABBITMQ_CUSTOMER_INFO_QUEUE`: `customer-info-queue`
- `RABBITMQ_INVENTORY_INFO_QUEUE`: `inventory-info-queue`

---

## 2. Cấu Hình Trong Code (Code Configuration)

### Không Có Module Chung (Code Duplication)
- Hiện tại không có `RmqModule` dùng chung trong `libs/common` (mặc dù có thể có file rác, nhưng cấu hình không được sử dụng tập trung).
- Cấu hình kết nối (Transport, URL, Queue options) được **lặp lại** (hardcoded/duplicated) trong từng service (`main.ts` và các `*.module.ts`).

### Consumer (Các Microservices nhận message)
Các service sử dụng `Transport.RMQ` trong `main.ts` để lắng nghe message.

| Service | Queue Env Var | Fallback Value (Code) | Prefetch/Options | Matches .env? |
|---------|---------------|-----------------------|------------------|---------------|
| **Order** | `RABBITMQ_ORDER_QUEUE` | `order-queue` | Retry: 5, Interval: 5s | ✅ Yes |
| **Customer** | `RABBITMQ_CUSTOMER_INFO_QUEUE` | `customer-info-queue` | Retry: 5, Interval: 5s | ✅ Yes |
| **Inventory** | `RABBITMQ_INVENTORY_INFO_QUEUE` | `inventory-info-queue` | Retry: 5, Interval: 5s | ✅ Yes |

### Producer (API Gateway gửi message)
API Gateway sử dụng `ClientsModule.register` để kết nối tới các services.

| Module | Service Name (Inject Token) | Queue Env Var (Used in Gateway) | Fallback Value (Code) | **MATCH STATUS** |
|--------|-----------------------------|---------------------------------|-----------------------|------------------|
| `OrderManagementModule` | `ORDER_MANAGEMENT_SERVICE` | `RABBITMQ_ORDER_QUEUE` | N/A (Required?) | ✅ **MATCH** |
| `CustomerModule` | `CUSTOMER_SERVICE` | `RABBITMQ_CUSTOMER_QUEUE` | `customer-queue` | ❌ **MISMATCH** |
| `ProductModule` | `INVENTORY_SERVICE` | `RABBITMQ_INVENTORY_QUEUE` | `inventory-queue` | ❌ **MISMATCH** |

> **Chi tiết lỗi Mismatch**:
> - Consumer Customer nghe ở `customer-info-queue`, nhưng Producer gửi vào `customer-queue` (do biến env `RABBITMQ_CUSTOMER_QUEUE` không có trong .env.development nên fallback về string mặc định).
> - Consumer Inventory nghe ở `inventory-info-queue`, Producer gửi vào `inventory-queue`.
> -> **Kết quả**: Request từ Gateway sẽ bị timeout hoặc drop.

---

## 3. Các Vấn Đề Khác (Other Findings)

### Cấu Trúc `libs/common`
- Có sự bất nhất trong cấu trúc thư mục `libs/common`. Có vẻ tồn tại song song cả `libs/common/index.ts` và `libs/common/src/index.ts`.
- Cần kiểm tra lại `tsconfig.json` path mapping để biết chính xác code đang import từ đâu.

---

## 4. Đề Xuất Cải Tiến (Recommendations)

1.  **Fix Mismatch (Ưu tiên cao nhất)**:
    - Cập nhật `.env.development` để định nghĩa rõ ràng các queue name.
    - Sửa code trong `CustomerModule` và `ProductModule` (tại Gateway) để dùng đúng biến môi trường (`RABBITMQ_CUSTOMER_INFO_QUEUE`, `RABBITMQ_INVENTORY_INFO_QUEUE`) hoặc cập nhật fallback string cho khớp.

2.  **Refactor Clean Code**:
    - Tạo `RmqModule` trong `libs/common` (Dynamic Module) để encapsulate việc `register` client.
    - Chuyển `RmqService` vào `libs/common` để quản lý logic Ack/Nack và Connection options.
    - Xóa bỏ các file trùng lặp hoặc không sử dụng trong `libs/common`.

3.  **Environment Variables**:
    - Thêm validation cho env vars (dùng `Joi` hoặc `class-validator` trong `ConfigModule`) để đảm bảo app không start nếu thiếu biến môi trường quan trọng.
