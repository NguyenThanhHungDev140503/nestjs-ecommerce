# 05. Testing Plan

## Unit Tests
- Mock `PrismaService` thay vì `Repository`.
- Kiểm tra các method `create`, `findOne`, `update`.
- Sử dụng `jest-mock-extended` để mock Prisma Client types dễ dàng hơn.

## Integration Tests
- Chạy `docker-compose up`.
- Sử dụng Database thật (dev container) để test flow:
  1. Create Order -> Check DB record (qua Prisma).
  2. Update Status -> Check change.

## Verification Checklist
- [ ] App start thành công không lỗi connection.
- [ ] API Create Order hoạt động.
- [ ] API Get Order hoạt động.
- [ ] Migration chạy thành công trên Neon DB.
