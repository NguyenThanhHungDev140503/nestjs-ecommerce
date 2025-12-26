# Các Bước Migration Chi Tiết

## Bước 1: Cài đặt Dependencies

```bash
# Cài pnpm (nếu chưa có)
npm install -g pnpm

# Xóa node_modules và lock files cũ
rm -rf node_modules
rm -f yarn.lock package-lock.json

# Cài đặt Nx
pnpm add -D nx @nx/nest @nx/js

# Init Nx Cloud
npx nx connect
```

---

## Bước 2: Tạo Nx Configuration

```bash
# Tạo nx.json
touch nx.json

# Tạo pnpm-workspace.yaml
touch pnpm-workspace.yaml

# Tạo tsconfig.base.json
touch tsconfig.base.json
```

Copy nội dung từ [nx-config.md](./nx-config.md).

---

## Bước 3: Tạo Packages Directory

```bash
mkdir -p packages/{database,config,rabbitmq,types,common}/src
```

---

## Bước 4: Di chuyển libs/common → packages/

### 4.1 Database Package

```bash
# Copy files
cp libs/common/database/* packages/database/src/

# Tạo index.ts
cat > packages/database/src/index.ts << 'EOF'
export * from './prisma.module';
export * from './prisma.service';
export * from './database.module';
export * from './database.service';
EOF
```

### 4.2 Types Package

```bash
# Copy DTOs và interfaces
cp -r libs/common/dto packages/types/src/
cp -r libs/common/interfaces packages/types/src/

# Tạo index.ts
cat > packages/types/src/index.ts << 'EOF'
export * from './dto/customer';
export * from './dto/product';
export * from './dto/create-order.dto';
export * from './dto/update-order.dto';
export * from './dto/delete-order.dto';
export * from './dto/order-id.dto';
export * from './dto/standard-response.dto';
export * from './interfaces/customer.interface';
export * from './interfaces/inventory.interface';
export * from './interfaces/order.interface';
EOF
```

### 4.3 RabbitMQ Package

```bash
# Copy constants
cp libs/common/constants/patterns.ts packages/rabbitmq/src/
cp libs/common/constants/services.ts packages/rabbitmq/src/
```

### 4.4 Common Package

```bash
# Copy auth và interceptors
cp -r libs/common/auth packages/common/src/
cp -r libs/common/interceptors packages/common/src/
cp libs/common/constants/order-status.ts packages/common/src/constants/
cp libs/common/constants/permissions.ts packages/common/src/constants/
```

---

## Bước 5: Tạo package.json cho mỗi App

```bash
for app in api-gateway order-management customer-service inventory-service notification-service; do
    cat > apps/$app/package.json << EOF
{
  "name": "@ecommerce/$app",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@ecommerce/common": "workspace:*",
    "@ecommerce/database": "workspace:*",
    "@ecommerce/rabbitmq": "workspace:*",
    "@ecommerce/types": "workspace:*"
  }
}
EOF
done
```

---

## Bước 6: Update Imports

Thay đổi tất cả imports từ:

```typescript
// TRƯỚC
import { PrismaService } from '@app/common';
import { CreateOrderDto } from '@app/common';
```

Thành:

```typescript
// SAU
import { PrismaService } from '@ecommerce/database';
import { CreateOrderDto } from '@ecommerce/types';
```

---

## Bước 7: Install và Verify

```bash
# Install dependencies
pnpm install

# Verify graph
pnpm nx graph

# Build tất cả
pnpm nx run-many --target=build --all

# Test
pnpm nx run-many --target=test --all
```

---

## Bước 8: Cleanup

```bash
# Xóa libs/common sau khi verify
rm -rf libs/

# Cập nhật nest-cli.json (optional - có thể giữ hoặc xóa)
```
