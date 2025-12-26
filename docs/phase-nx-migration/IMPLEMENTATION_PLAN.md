# Migration: NestJS CLI Monorepo → Nx + PNPM Workspaces

## Mục Tiêu

Chuyển đổi dự án `nestjs-ecommerce` từ **NestJS CLI Monorepo** (single package.json) sang **Nx + PNPM Workspaces** với:
- Namespace: `@ecommerce/*`
- Nx Cloud cho remote caching
- Affected commands cho CI/CD optimization

---

## User Review Required

> [!IMPORTANT]
> **Breaking Changes:**
> - Package manager: `yarn` → `pnpm`
> - Import paths: `@app/common` → `@ecommerce/*`
> - Build system: NestJS CLI → Nx
> - Cấu trúc: `libs/common` → `packages/*`

> [!WARNING]
> **Cần quyết định:**
> - Giữ hay xóa `nest-cli.json` sau migration?
> - Sử dụng Nx generators hay giữ NestJS schematics?

---

## Proposed Changes

### Infrastructure (Root Level)

#### [NEW] [nx.json](file:///media/nguyenthanhhung/Code/NestJS-Microservice/nestjs-ecommerce/nx.json)

Cấu hình Nx workspace với caching, affected commands, và Nx Cloud.

#### [NEW] [pnpm-workspace.yaml](file:///media/nguyenthanhhung/Code/NestJS-Microservice/nestjs-ecommerce/pnpm-workspace.yaml)

Định nghĩa workspaces cho `apps/*`, `packages/*`.

#### [MODIFY] [package.json](file:///media/nguyenthanhhung/Code/NestJS-Microservice/nestjs-ecommerce/package.json)

- Di chuyển dependencies vào từng app/package
- Giữ lại shared devDependencies
- Thêm Nx scripts

#### [NEW] [tsconfig.base.json](file:///media/nguyenthanhhung/Code/NestJS-Microservice/nestjs-ecommerce/tsconfig.base.json)

Path aliases cho `@ecommerce/*` packages.

---

### Package: @ecommerce/database

#### [NEW] [packages/database/package.json](file:///media/nguyenthanhhung/Code/NestJS-Microservice/nestjs-ecommerce/packages/database/package.json)

```json
{
  "name": "@ecommerce/database",
  "version": "1.0.0",
  "dependencies": {
    "@prisma/client": "^7.2.0",
    "@neondatabase/serverless": "^1.0.2"
  }
}
```

#### [NEW] [packages/database/src/index.ts](file:///media/nguyenthanhhung/Code/NestJS-Microservice/nestjs-ecommerce/packages/database/src/index.ts)

Export Prisma module và service từ `libs/common/database`.

---

### Package: @ecommerce/config

#### [NEW] [packages/config/package.json](file:///media/nguyenthanhhung/Code/NestJS-Microservice/nestjs-ecommerce/packages/config/package.json)

Configuration management, environment validation.

---

### Package: @ecommerce/rabbitmq

#### [NEW] [packages/rabbitmq/package.json](file:///media/nguyenthanhhung/Code/NestJS-Microservice/nestjs-ecommerce/packages/rabbitmq/package.json)

RabbitMQ patterns, connection utilities từ `libs/common/constants`.

---

### Package: @ecommerce/types

#### [NEW] [packages/types/package.json](file:///media/nguyenthanhhung/Code/NestJS-Microservice/nestjs-ecommerce/packages/types/package.json)

DTOs và interfaces từ `libs/common/dto`, `libs/common/interfaces`.

---

### Package: @ecommerce/common

#### [NEW] [packages/common/package.json](file:///media/nguyenthanhhung/Code/NestJS-Microservice/nestjs-ecommerce/packages/common/package.json)

Auth, guards, decorators, interceptors từ `libs/common/auth`, `libs/common/interceptors`.

---

### Apps Migration

#### [MODIFY] [apps/api-gateway/package.json](file:///media/nguyenthanhhung/Code/NestJS-Microservice/nestjs-ecommerce/apps/api-gateway/package.json)

Tạo package.json riêng với dependencies từ `@ecommerce/*`.

#### [MODIFY] Các apps khác tương tự

- `order-management`
- `customer-service`
- `inventory-service`
- `notification-service`

---

### CI/CD

#### [NEW] [.github/workflows/nx-ci.yml](file:///media/nguyenthanhhung/Code/NestJS-Microservice/nestjs-ecommerce/.github/workflows/nx-ci.yml)

GitHub Actions với Nx Cloud và affected commands.

---

## Verification Plan

### Automated Tests

1. **Nx Graph Check**
   ```bash
   npx nx graph --file=nx-graph.json
   # Verify tất cả apps và packages được detect
   ```

2. **Build All**
   ```bash
   npx nx run-many --target=build --all
   # Verify build thành công cho tất cả apps
   ```

3. **Test Affected**
   ```bash
   npx nx affected:test --base=HEAD~1
   # Verify tests vẫn pass
   ```

4. **Lint Check**
   ```bash
   npx nx run-many --target=lint --all
   # Verify không có lint errors
   ```

### Manual Verification

1. **Kiểm tra pnpm install**
   - Chạy `pnpm install` từ root
   - Verify tất cả packages được linked

2. **Chạy thử từng service**
   - `pnpm nx serve api-gateway`
   - `pnpm nx serve order-management`
   - Verify services khởi động thành công

3. **Docker Build**
   - `docker-compose build`
   - Verify Docker images build thành công

4. **Nx Cloud**
   - Kiểm tra Nx Cloud dashboard
   - Verify remote caching hoạt động

---

## File Structure After Migration

```
nestjs-ecommerce/
├── nx.json                          # [NEW]
├── pnpm-workspace.yaml              # [NEW]
├── pnpm-lock.yaml                   # [NEW] (replaces yarn.lock)
├── tsconfig.base.json               # [NEW]
├── package.json                     # [MODIFIED]
├── apps/
│   ├── api-gateway/
│   │   ├── package.json             # [NEW]
│   │   └── ...
│   ├── order-management/
│   │   ├── package.json             # [NEW]
│   │   └── ...
│   └── ...
├── packages/                        # [NEW - replaces libs/]
│   ├── database/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   ├── config/
│   ├── rabbitmq/
│   ├── types/
│   └── common/
├── libs/                            # [TO BE DELETED after migration]
│   └── common/
└── docs/
    └── phase-nx-migration/
```
