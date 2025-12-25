# Notification Service

Microservice xử lý thông báo đa kênh (email, SMS, push, in-app) tích hợp với [Novu](https://novu.co/).

## Features

- 📧 **Email Notifications** - Xác nhận đơn hàng, cập nhật vận chuyển
- 📱 **SMS Notifications** - Thông báo khẩn cấp
- 🔔 **Push Notifications** - Real-time alerts
- 💬 **In-App Notifications** - Thông báo trong ứng dụng
- ⚙️ **User Preferences** - Người dùng tự quản lý settings
- 🔄 **Event-Driven** - Tự động gửi khi có events từ các service khác

## Prerequisites

- Node.js 18+
- RabbitMQ
- PostgreSQL
- Redis
- Novu (self-hosted qua Docker)

## Environment Variables

| Variable                      | Description                | Default                 |
| ----------------------------- | -------------------------- | ----------------------- |
| `RABBITMQ_NOTIFICATION_QUEUE` | Queue name                 | `notification-queue`    |
| `NOVU_API_KEY`                | Novu API key               | -                       |
| `NOVU_APP_ID`                 | Novu App ID                | -                       |
| `NOVU_API_URL`                | Novu API URL (self-hosted) | `http://localhost:3004` |
| `NOTIFICATION_EMAIL_ENABLED`  | Enable email channel       | `true`                  |
| `NOTIFICATION_SMS_ENABLED`    | Enable SMS channel         | `false`                 |
| `NOTIFICATION_PUSH_ENABLED`   | Enable push channel        | `false`                 |
| `NOTIFICATION_MAX_RETRIES`    | Max retry attempts         | `3`                     |
| `NOTIFICATION_RATE_LIMIT`     | Requests per minute        | `100`                   |

## Quick Start

```bash
# 1. Install dependencies
yarn install

# 2. Generate Prisma client (cần làm sau khi thêm schema mới)
yarn prisma:generate

# 3. Run database migration
yarn prisma:migrate:dev --name add_notification_tables

# 4. Start Novu (self-hosted) + dependencies
docker-compose up -d novu-api novu-worker novu-web mongo redis rmq

# 5. Start notification service
yarn start:notification-service
```

## Novu Setup (Self-Hosted)

1. Truy cập Novu dashboard: http://localhost:4200
2. Đăng ký account mới
3. Lấy API key từ Settings > API Keys
4. Cập nhật `.env` với `NOVU_API_KEY` và `NOVU_APP_ID`
5. Tạo workflows trong Novu dashboard:
   - `order-confirmation` - Xác nhận đơn hàng
   - `shipping-update` - Cập nhật vận chuyển
   - `low-stock-alert` - Cảnh báo tồn kho thấp

## Event Patterns

Service lắng nghe các events:

| Event                 | Action                 |
| --------------------- | ---------------------- |
| `order.created`       | Gửi xác nhận đơn hàng  |
| `order.cancelled`     | Gửi thông báo hủy đơn  |
| `inventory.low_stock` | Gửi cảnh báo cho admin |

## Message Patterns

| Pattern                           | Description               |
| --------------------------------- | ------------------------- |
| `notification.send`               | Gửi notification thủ công |
| `notification.templates.get`      | Lấy danh sách templates   |
| `notification.preferences.get`    | Lấy preferences user      |
| `notification.preferences.update` | Cập nhật preferences      |
| `notification.history.get`        | Lấy lịch sử notification  |

## Project Structure

```
apps/notification-service/
├── src/
│   ├── config/
│   │   └── notification.config.ts    # Config-driven settings
│   ├── novu/
│   │   ├── novu.module.ts            # Novu module
│   │   └── novu.service.ts           # Novu integration
│   ├── exceptions/
│   │   └── notification.exception.ts # Custom exceptions
│   ├── main.ts                       # Entry point
│   ├── notification.module.ts        # Main module
│   ├── notification.service.ts       # Core service
│   ├── notification.controller.ts    # Event handlers
│   └── user-preference.service.ts    # User preferences
└── tsconfig.app.json
```

## Testing

```bash
# Run unit tests
yarn test --testPathPattern=notification-service

# Run with coverage
yarn test:cov --testPathPattern=notification-service
```

## Database Schema

4 tables mới trong Prisma:

- `notification_templates` - Mẫu thông báo
- `notification_logs` - Lịch sử gửi
- `notification_preferences` - Cài đặt user
- `notification_providers` - Cấu hình providers

## Troubleshooting

### Prisma types not recognized

```bash
yarn prisma:generate
```

### Novu connection failed

- Kiểm tra Novu containers đang chạy: `docker-compose ps`
- Kiểm tra API key đúng
- Kiểm tra network connectivity

### RabbitMQ connection failed

- Kiểm tra RMQ đang chạy
- Kiểm tra `RABBITMQ_URL` trong `.env`
