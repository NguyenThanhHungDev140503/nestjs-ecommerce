# Phase: Migrating from TypeORM to Prisma

## Tổng quan
Phase này tập trung vào việc chuyển đổi ORM của dự án từ TypeORM sang Prisma để tận dụng các tính năng hiện đại, type-safety tốt hơn và workflow migration rõ ràng hơn.

## Mục tiêu
- Thay thế toàn bộ TypeORM bằng Prisma trong service `order-management`.
- Đảm bảo dữ liệu được migrate an toàn (nếu có).
- Cập nhật cấu hình CI/CD và Docker.
- Đảm bảo tính tương thích với Neon Database (PostgreSQL).

## Tài liệu chi tiết
- [01-analysis.md](./01-analysis.md): Phân tích hiện trạng và mapping.
- [02-prisma-schema.md](./02-prisma-schema.md): Thiết kế Schema mới.
- [03-migration-steps.md](./03-migration-steps.md): Các bước thực hiện.
- [04-code-changes.md](./04-code-changes.md): Thay đổi code cụ thể.
- [05-testing.md](./05-testing.md): Kế hoạch kiểm thử.
