# Novu - Hướng Dẫn Toàn Diện

## Mục Lục

- [1. Giới Thiệu Tổng Quan](#1-giới-thiệu-tổng-quan)
- [2. Junior Level - Cơ Bản](#2-junior-level---cơ-bản)
  - [Cài đặt & Cấu hình](#cài-đặt--cấu-hình)
  - [Hello World Example](#hello-world-example)
- [3. Middle Level - A-Z Guide: In-App & Email Workflow](#3-middle-level---a-z-guide-in-app--email-workflow)
  - [Bước 1: Backend Setup (NestJS)](#bước-1-backend-setup-nestjs)
  - [Bước 2: Define Workflow (In-App + Email)](#bước-2-define-workflow-in-app--email)
  - [Bước 3: Frontend Setup (React)](#bước-3-frontend-setup-react)
  - [Bước 4: Trigger Notification](#bước-4-trigger-notification)

---

## 1. Giới Thiệu Tổng Quan

### Novu là gì?

Novu là "Stripe for Notifications". Nó cung cấp cơ sở hạ tầng để gửi thông báo qua nhiều kênh (Email, SMS, In-App, Push) thông qua một API duy nhất.

### Tại sao sử dụng Novu?

- **Unified API**: Không cần tích hợp riêng lẻ SendGrid, Twilio, FCM...
- **Embeddable UI**: Cung cấp sẵn React Component `<Inbox />` đẹp, đầy đủ tính năng.
- **Visual Workflow**: Dễ dàng quản lý luồng gửi tin (VD: Gửi In-App -> Chờ 1 tiếng -> Gửi Email nếu chưa đọc).
- **Digests**: Tự động gộp nhiều thông báo (VD: "Harry and 5 others liked your post").

### Các Concepts Cốt Lõi

- **Workflow**: Kịch bản gửi thông báo.
- **Provider**: Dịch vụ bên thứ 3 thực sự gửi tin (VD: Gmail, SendGrid).
- **Subscriber**: Người dùng nhận thông báo.
- **Topic**: Nhóm người dùng.

---

## 2. Junior Level - Cơ Bản

### Cài đặt & Cấu hình

#### 1. Tạo tài khoản & Lấy API Key

1. Truy cập [Novu Dashboard](https://dashboard.novu.co/).
2. Đăng ký tài khoản (miễn phí).
3. Vào **Settings** -> **API Keys** để lấy `API Key` và `Application Identifier`.
4. Vào **Integrations Store** -> Connect một Email Provider (VD: **SendGrid**, **Resend** hoặc **Custom SMTP**).
   - _Lưu ý_: Mặc định có "Novu Email" (Demo) nhưng giới hạn số lượng. Nên setup provider riêng.

#### 2. Cài đặt SDK cho NestJS

```bash
npm install @novu/node @novu/framework
```

### Hello World Example

Code này sẽ trigger một workflow có sẵn (tạo trên Dashboard).

```typescript
import { Novu } from '@novu/node';

const novu = new Novu('<YOUR_API_KEY>');

async function sendHello() {
  await novu.trigger('onboarding', {
    to: {
      subscriberId: 'user-001',
      firstName: 'Hung',
      lastName: 'Nguyen',
    },
    payload: {
      message: 'Hello World from Code!',
    },
  });
}
```

---

## 2.5. Hướng Dẫn Setup Email Provider (Chi Tiết)

Để gửi email thực tế (không phải demo), bạn cần cấu hình Provider trong Novu Dashboard.

### Cách 1: Sử dụng SMTP (Gmail, Outlook, Custom Server)

Thích hợp cho Self-Hosted hoặc môi trường Dev.

1. Truy cập **Integrations Store** trên Dashboard.
2. Tìm và chọn **"Custom SMTP"**.
3. Điền thông tin:
   - **Host**: `smtp.gmail.com` (ví dụ cho Gmail)
   - **Port**: `465` (SSL) hoặc `587` (TLS)
   - **User**: Email của bạn
   - **Password**: App Password (không phải mật khẩu đăng nhập email).
   - **From Email**: Email người gửi (phải trùng với User hoặc được verify).
4. Nhấn **Update** và bật **Active**.

### Cách 2: Sử dụng Dịch vụ (SendGrid, Resend, Mailgun)

Thích hợp cho Production, tỉ lệ vào inbox cao hơn.

**Ví dụ với Resend (Free 3000 emails/tháng):**

1. Đăng ký tài khoản tại [Resend.com](https://resend.com).
2. Tạo API Key.
3. Trong Novu Dashboard -> **Integrations Store** -> chọn **Resend**.
4. Paste API Key và điền "From Email" (VD: `onboarding@resend.dev` nếu chưa có domain).
5. Nhấn **Update** -> **Active**.

---

## 3. Middle Level - A-Z Guide: In-App & Email Workflow

Phần này hướng dẫn tạo một hệ thống thông báo hoàn chỉnh dùng **Code-First (Novu Framework)**.

### Mục tiêu

Tạo workflow `order-confirmation`:

1. Gửi **In-App** notification ("Đơn hàng #123 đã đặt thành công").
2. Gửi **Email** xác nhận chi tiết đơn hàng.

### Bước 1: Backend Setup (NestJS)

Cấu hình Route `/api/novu` để Novu Cloud sync workflow.

**File: `src/novu/novu.controller.ts`**

```typescript
import { Controller, Post, Res, Body, Get } from '@nestjs/common';
import { serve } from '@novu/framework/nestjs';
import { orderConfirmationWorkflow } from './workflows/order-confirmation';

@Controller('api/novu')
export class NovuController {
  @Get() // hoặc Post/Put tùy setup tunnel
  @Post()
  async handleNovu(@Res() res: any, @Body() body: any) {
    // expose workflow endpoint
    return serve({
      workflows: [orderConfirmationWorkflow],
    })(res, body); // *Lưu ý: Check docs mới nhất của @novu/framework/nestjs cho cú pháp chính xác
  }
}
```

**Lưu ý**: Để Novu Cloud gọi được localhost, bạn cần dùng **Ngrok** hoặc **Local Tunnel**.

```bash
npx ngrok http 3000
# Copy URL ngrok dán vào Novu Dashboard -> Local Studio
```

_Hoặc dùng lệnh `npx novu dev` để tạo tunnel tự động._

### Bước 2: Define Workflow (In-App + Email)

Tạo file định nghĩa workflow bằng code.

**File: `src/novu/workflows/order-confirmation.ts`**

```typescript
import { workflow } from '@novu/framework';
import { z } from 'zod'; // dùng zod để validate payload

export const orderConfirmationWorkflow = workflow(
  'order-confirmation',
  async ({ step, payload }) => {
    // 1. In-App Notification
    await step.inApp('in-app-step', async () => {
      return {
        subject: 'Đơn hàng thành công!',
        body: `Đơn hàng #${payload.orderId} trị giá ${payload.total} đã được ghi nhận.`,
        avatar: 'https://i.pravatar.cc/150', // optional
      };
    });

    // 2. Email Notification
    await step.email('email-step', async () => {
      return {
        subject: `Xác nhận đơn hàng #${payload.orderId}`,
        body: `<h1>Cảm ơn bạn đã mua hàng, ${payload.customerName}!</h1>
               <p>Tổng tiền: ${payload.total}</p>
               <a href="${payload.orderLink}">Xem chi tiết</a>`,
      };
    });
  },
  {
    // Validate input payload
    payloadSchema: z.object({
      orderId: z.string(),
      total: z.string(),
      customerName: z.string(),
      orderLink: z.string().url(),
    }),
  },
);
```

Sau khi chạy app, Novu sẽ scan workflow này và hiển thị trên Dashboard.

### Bước 3: Frontend Setup (React)

Hiển thị In-App Inbox.

**Cài đặt:**

```bash
npm install @novu/react
```

**File: `App.tsx` hoặc `Layout.tsx`** (Root Component)

```tsx
import { NovuProvider, Inbox } from '@novu/react';

function App() {
  const subscriberId = 'user-001'; // ID của user đang login
  const applicationIdentifier = 'YOUR_APP_ID'; // Lấy từ Dashboard

  return (
    <NovuProvider
      subscriberId={subscriberId}
      applicationIdentifier={applicationIdentifier}
    >
      <YourAppContent />

      {/* Đặt Inbox ở vị trí mong muốn, thường là Header */}
      <div style={{ position: 'fixed', top: 20, right: 20 }}>
        <Inbox
          // Tùy chỉnh theme/màu sắc
          appearance={{
            elements: {
              bellIcon: { color: '#000' },
            },
          }}
        />
      </div>
    </NovuProvider>
  );
}
```

### Bước 4: Trigger Notification

Gọi API trigger từ Backend Service (VD: sau khi OrderService tạo đơn hàng).

**File: `src/modules/order/order.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { Novu } from '@novu/node';

@Injectable()
export class OrderService {
  private novu = new Novu(process.env.NOVU_API_KEY);

  async createOrder(userId: string, orderDetails: any) {
    // Logic tạo đơn hàng...
    // const order = ...

    // Trigger Workflow
    await this.novu.trigger('order-confirmation', {
      to: {
        subscriberId: userId,
        // Có thể update info user ngay tại đây nếu chưa tồn tại
        email: 'user@example.com',
        firstName: 'Hung',
      },
      payload: {
        orderId: 'ORD-123',
        total: '500.000 VND',
        customerName: 'Hung Nguyen',
        orderLink: 'https://myapp.com/orders/ORD-123',
      },
    });
  }
}
```

## Tổng Kết Luồng Chạy

1. User đặt hàng -> Backend gọi `orderService.createOrder()`.
2. `novu.trigger()` bắn event lên Novu Cloud.
3. Novu Cloud xử lý workflow:
   - Gửi In-App notification (User thấy ngay trên UI React).
   - Gửi Email (qua Provider như SendGrid/Gmail).
