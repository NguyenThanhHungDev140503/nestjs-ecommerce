# Troubleshooting

## Lỗi Thường Gặp

### 1. Module not found: @ecommerce/*

**Nguyên nhân**: tsconfig paths chưa được cấu hình đúng.

**Giải pháp**:
```bash
# Kiểm tra tsconfig.base.json có paths
cat tsconfig.base.json | grep -A 10 "paths"

# Mỗi app phải extend tsconfig.base.json
# apps/api-gateway/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  ...
}
```

---

### 2. PNPM workspace package not found

**Nguyên nhân**: pnpm-workspace.yaml chưa đúng hoặc chưa chạy `pnpm install`.

**Giải pháp**:
```bash
# Kiểm tra workspace
pnpm ls --depth=0

# Reinstall
rm -rf node_modules
pnpm install
```

---

### 3. Nx không detect projects

**Nguyên nhân**: Thiếu `package.json` trong apps/packages.

**Giải pháp**:
```bash
# Verify mỗi app/package có package.json
ls -la apps/*/package.json
ls -la packages/*/package.json

# Hoặc tạo project.json nếu không dùng package.json
```

---

### 4. Circular dependency

**Nguyên nhân**: Package A import Package B và ngược lại.

**Giải pháp**:
```bash
# Xem graph để detect
pnpm nx graph

# Tách common code ra package riêng
# Hoặc dùng interface/abstract để break cycle
```

---

### 5. Build fails với decorator metadata

**Nguyên nhân**: TypeScript config thiếu decorator settings.

**Giải pháp**:
```json
// tsconfig.base.json
{
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}
```

---

### 6. Prisma client not generated

**Nguyên nhân**: Prisma generate chưa chạy sau install.

**Giải pháp**:
```bash
# Thêm postinstall script
# root package.json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}

# Hoặc chạy thủ công
pnpm prisma generate
```

---

### 7. Docker build fails

**Nguyên nhân**: Dockerfile chưa update để dùng pnpm.

**Giải pháp**:
```dockerfile
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./

# Copy tất cả package.json files
COPY apps/*/package.json ./apps/
COPY packages/*/package.json ./packages/

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm nx build api-gateway --prod
```

---

## Commands Debug

```bash
# Check Nx version
pnpm nx --version

# List all projects
pnpm nx show projects

# Debug affected
pnpm nx affected:graph

# Clear cache
pnpm nx reset

# Verbose build
pnpm nx build api-gateway --verbose
```
