# Novu Documentation

## 1. Giới thiệu

Novu là nền tảng thông báo mã nguồn mở (Open Source Notification Infrastructure) giúp đơn giản hóa việc gửi thông báo đa kênh (In-App, Email, SMS, Push, Chat).

Thay vì phải tự xây dựng hệ thống quản lý template, provider, routing, và logic gửi tin, Novu cung cấp một giải pháp "Unified API" để xử lý tất cả.

## 2. Cấu Trúc Tài Liệu

- **[Novu.md](./Novu.md)** (Junior/Middle/Senior):
  - Hướng dẫn cài đặt & cấu hình cơ bản.
  - **A-Z Guide**: Tạo workflow In-App & Email cho NestJS.
  - Các concepts cốt lõi: Workflow, Steps, Subscriber.
- **[Advanced-Patterns.md](./Advanced-Patterns.md)** (Senior):
  - Các patterns nâng cao: Digest, Delay, Topics.
  - Custom Provider.
  - Testing & Debugging.
- **[Principal-Level-Patterns.md](./Principal-Level-Patterns.md)** (Principal):
  - Kiến trúc hệ thống thông báo quy mô lớn.
  - Self-hosting Novu.
  - Multi-tenancy strategies.
- **[RESEARCH_SUMMARY.md](./RESEARCH_SUMMARY.md)**:
  - Tóm tắt quá trình research và nguồn tài liệu tham khảo.

## 3. Cách Sử Dụng Tài Liệu

- **Junior Dev**: Đọc `Novu.md` để hiểu cách tích hợp Novu vào NestJS và React, cách gửi một email đơn giản.
- **Middle Dev**: Đọc `Novu.md` để nắm rõ luồng làm việc và `Advanced-Patterns.md` khi cần xử lý logic phức tạp (gom nhóm thông báo, delay).
- **Senior/Principal**: Đọc `Principal-Level-Patterns.md` để thiết kế hạ tầng nếu self-host hoặc scale hệ thống.

## 4. Key Concepts

- **Workflow**: Một luồng thông báo (VD: "Forgot Password"). Gồm nhiều steps (Email -> Wait -> In-App).
- **Subscriber**: Người nhận thông báo (User). Được định danh bằng `subscriberId`.
- **Topic**: Nhóm các subscribers (VD: "All Users", "Admin").
- **Provider**: Dịch vụ gửi tin (SendGrid, Twilio, FCM,...).

## 5. Quick Start

```bash
# 1. Install NestJS SDK
npm install @novu/node @novu/framework

# 2. Trigger notification
import { Novu } from '@novu/node';
const novu = new Novu('YOUR_API_KEY');

await novu.trigger('workflow-id', {
  to: { subscriberId: 'user-123' },
  payload: { name: 'User' }
});
```

## 6. External Resources

- [Novu Documentation](https://docs.novu.co)
- [Novu GitHub](https://github.com/novuhq/novu)
- [Novu Playground](https://dashboard.novu.co)
