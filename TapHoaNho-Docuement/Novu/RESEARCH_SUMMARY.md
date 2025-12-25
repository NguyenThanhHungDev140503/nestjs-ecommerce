# Research Summary: Novu

## 1. Mục Tiêu Research

- **Mục đích**: Tìm hiểu thư viện Novu để triển khai tính năng Notification (In-App & Email) cho dự án NestJS.
- **Kết quả mong đợi**: Bộ tài liệu hướng dẫn từ A-Z cách cài đặt, cấu hình, và tích hợp Novu vào NestJS (Backend) và React (Frontend).

## 2. Nguồn Thông Tin Đã Sử Dụng

- **Official Docs**:
  - [Novu Framework Quickstart](https://docs.novu.co/framework/quickstart) (via Context7)
  - [Novu NestJS Integration](https://docs.novu.co/platform/integrations/nestjs) (via Context7)
  - [Novu React SDK](https://docs.novu.co/notification-center/client/react/get-started) (via Context7)
  - [Novu Email Integrations](https://docs.novu.co/platform/integrations/email) (via Context7) - Hỗ trợ nhiều provider: SendGrid, Resend, Custom SMTP. Cấu hình qua Integration Store.
- **GitHub Repos**:
  - `novuhq/novu`: Repo chính, xem `playground/nestjs` và `packages/framework` để hiểu cách implement.
- **Search**:
  - Tavily Search: Tìm kiếm tutorial và so sánh.

## 3. Phát Hiện Chính (Key Findings)

- **Architecture**: Novu có 2 cách tiếp cận chính:
  1.  **Dashboard-managed**: Tạo workflow trên Web UI của Novu -> Developer chỉ việc trigger. ưu điểm: Dễ cho non-tech sửa nội dung. Nhược điểm: Khó version control.
  2.  **Code-first (Novu Framework)**: Định nghĩa workflow bằng code (TS functions) -> Sync lên Dashboard. Ưu điểm: Version control, DX tốt hơn. -> **Nên dùng cách này cho dự án NestJS**.
- **NestJS Integration**:
  - Dùng `@novu/node` để trigger notification.
  - Dùng `@novu/framework` để define workflow và serve endpoint (e.g., `/api/novu`) cho Novu Cloud gọi về (nếu dùng Workflow as Code).
- **Frontend Integration**:
  - `@novu/react`: Cung cấp component `<Inbox />` (mới) và `<NotificationCenter />` (cũ). Nên dùng `<Inbox />` cho trải nghiệm hiện đại.

## 4. Kiến Trúc/Cách Dùng Đề Xuất

- **Backend (NestJS)**:
  - Tạo một module `NotificationModule`.
  - Định nghĩa workflows trong folder `src/novu/workflows/`.
  - Expose route `/api/novu` để serve workflows.
  - Service `NotificationService` wrapper lại `@novu/node` để trigger events.
- **Frontend (React)**:
  - Wrap App bằng `<NovuProvider>`.
  - Nhúng `<Inbox />` vào Header/Navbar.

## 5. Use Cases Đã Xác Định

- **In-App Notification**: Thông báo đơn hàng, cập nhật hệ thống. -> [Link to Novu.md](#)
- **Email Notification**: Gửi email xác nhận, reset password. -> [Link to Novu.md](#)
- **Digest**: Gộp nhiều thông báo like/comment vào 1 email. -> [Link to Advanced-Patterns.md](#)
