# Phase: Nx Migration

Tài liệu cho việc chuyển đổi từ **NestJS CLI Monorepo** sang **Nx + PNPM Workspaces**.

## Files

| File | Mô Tả |
|------|-------|
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Kế hoạch triển khai chi tiết |
| [nx-config.md](./nx-config.md) | Cấu hình Nx và giải thích |
| [package-structure.md](./package-structure.md) | Cấu trúc các packages mới |
| [migration-steps.md](./migration-steps.md) | Các bước di chuyển từng phần |
| [troubleshooting.md](./troubleshooting.md) | Xử lý lỗi thường gặp |

## Quick Reference

```bash
# Install pnpm globally
npm install -g pnpm

# Initialize Nx
pnpm add -D nx

# Build all
pnpm nx run-many --target=build --all

# Test affected
pnpm nx affected:test

# View graph
pnpm nx graph
```

## Status

- [ ] Planning approved
- [ ] Setup Nx infrastructure
- [ ] Tách packages
- [ ] Migrate apps
- [ ] CI/CD setup
- [ ] Verification complete
