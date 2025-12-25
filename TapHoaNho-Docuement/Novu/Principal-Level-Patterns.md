# Principal-Level Patterns cho Novu

Dành cho Architects và Staff Engineers khi thiết kế hệ thống Notification quy mô Enterprise.

## 1. Enterprise Architecture

Trong hệ thống Microservices, Novu nên được tích hợp như một **Centralized Notification Service**.

```mermaid
graph TD
    A[Order Service] -->|Event: ORDER_CREATED| B(Notification Service)
    C[Auth Service] -->|Event: USER_REGISTERED| B
    B -->|Trigger| D[Novu Cloud / Self-Hosted]
    D --> E[Email Provider (SendGrid)]
    D --> F[In-App (WebSocket)]
    D --> G[Push (FCM)]
```

### Best Practices:

- **Abstraction Layer**: Service gọi Novu SDK nên được wrap lại (`NotificationService`) để dễ dàng switch provider hoặc mock khi test.
- **Queueing**: Dù Novu có queue nội bộ, nhưng Service của bạn nên đẩy job vào Queue (Redis/BullMQ) trước khi gọi Novu Trigger để đảm bảo resilience nếu Novu API chậm/lỗi.

## 2. Security & Compliance

### HMAC Encryption (In-App)

Để ngăn chặn user giả mạo ID người khác để đọc thông báo, BẮT BUỘC bật HMAC cho In-App Feed.

```typescript
// Backend: Generate HMAC Hash
import * as crypto from 'crypto';

const hash = crypto
  .createHmac('sha256', process.env.NOVU_SECRET_KEY)
  .update(subscriberId)
  .digest('hex');
// Gửi hash này về FE
```

```tsx
// Frontend
<NovuProvider subscriberHash={hash} ... />
```

### Data Resilience

- **Idempotency**: Đảm bảo `transactionId` là unique cho mỗi event quan trọng để tránh gửi duplicate notification.

## 3. Scale & Performance

- **Bulk Trigger**: Khi cần gửi cho >500 user, sử dụng Bulk Trigger API thay vì loop trigger từng user.
- **Workflow Optimization**: Tránh các workflow quá phức tạp (quá nhiều branch/delay) nếu thời gian thực thi quan trọng (VD: gửi mã OTP).

## 4. Self-Hosting Strategy

Nếu doanh nghiệp yêu cầu Data Sovereignty (dữ liệu không ra khỏi server), có thể self-host Novu bằng Docker Compose.

**Cấu hình tối thiểu:**

- **Redis**: Queue management.
- **MongoDB**: Lưu trữ cấu hình workflow, subscribers.
- **S3 / MinIO**: Lưu trữ assets (ảnh avatar, đính kèm).

**Resource Recommendation**:

- CPU: 2-4 Cores
- RAM: 4-8 GB
  _Lưu ý: Self-hosting yêu cầu effort vận hành lớn (update, backup, monitoring)._

## 5. Multi-Tenancy

Nếu bạn xay dựng sản phẩm B2B SaaS (Multitenant), Novu hỗ trợ thông qua **Organization** hoặc **Environment**.

- Tách biệt production/staging environments.
- Với mỗi tenant khách hàng, có thể dùng `subscriberId` prefix (e.g., `tenantA:user1`) hoặc dùng Topic để quản lý nhóm user theo Tenant.
