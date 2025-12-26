# Commands Cheatsheet

> Tất cả commands thường dùng cho Nix, Nx, Docker trong dự án nestjs-ecommerce.

## 1. Nix Commands

### 1.1. Development Shell

| Command | Mô Tả |
|---------|-------|
| `nix develop` | Vào development shell đầy đủ |
| `nix develop .#ci` | Vào CI shell (minimal) |
| `exit` | Thoát khỏi nix shell |

### 1.2. Build & Run

| Command | Mô Tả |
|---------|-------|
| `nix build` | Build default package (api-gateway) |
| `nix build .#api-gateway` | Build api-gateway |
| `nix build .#order-management` | Build order-management |
| `nix build .#all` | Build tất cả services |
| `nix run .#api-gateway` | Run api-gateway |
| `nix run .#graph` | Mở Nx dependency graph |

### 1.3. Flake Management

| Command | Mô Tả |
|---------|-------|
| `nix flake check` | Chạy tất cả checks |
| `nix flake show` | Hiển thị tất cả outputs |
| `nix flake update` | Update flake.lock |
| `nix flake lock --update-input nixpkgs` | Update chỉ nixpkgs |
| `nix flake metadata` | Hiển thị metadata |

### 1.4. Debugging

| Command | Mô Tả |
|---------|-------|
| `nix build .#api-gateway --verbose` | Build với verbose output |
| `nix build .#api-gateway --print-build-logs` | Hiển thị build logs |
| `nix repl` | Vào Nix REPL |
| `nix eval .#packages.x86_64-linux.api-gateway` | Evaluate expression |

---

## 2. Nx Commands

### 2.1. Build

| Command | Mô Tả |
|---------|-------|
| `npx nx build api-gateway` | Build api-gateway |
| `npx nx build api-gateway --configuration=production` | Build production |
| `npx nx run-many -t build` | Build tất cả projects |
| `npx nx run-many -t build -p api-gateway,order-management` | Build selected |
| `npx nx affected -t build` | Build affected projects |

### 2.2. Serve

| Command | Mô Tả |
|---------|-------|
| `npx nx serve api-gateway` | Serve api-gateway |
| `npx nx serve api-gateway --watch` | Serve với watch mode |
| `npx nx run-many -t serve -p api-gateway,order-management` | Serve nhiều |

### 2.3. Test

| Command | Mô Tả |
|---------|-------|
| `npx nx test api-gateway` | Test api-gateway |
| `npx nx test api-gateway --watch` | Test với watch mode |
| `npx nx test api-gateway --coverage` | Test với coverage |
| `npx nx run-many -t test` | Test tất cả |
| `npx nx affected -t test` | Test affected |

### 2.4. Lint

| Command | Mô Tả |
|---------|-------|
| `npx nx lint api-gateway` | Lint api-gateway |
| `npx nx lint api-gateway --fix` | Lint và auto-fix |
| `npx nx run-many -t lint` | Lint tất cả |
| `npx nx affected -t lint` | Lint affected |

### 2.5. Graph & Analysis

| Command | Mô Tả |
|---------|-------|
| `npx nx graph` | Mở dependency graph UI |
| `npx nx graph --file=output.html` | Export graph to file |
| `npx nx affected:graph` | Hiển thị affected graph |
| `npx nx list` | List installed plugins |
| `npx nx show project api-gateway` | Hiển thị project config |
| `npx nx show project api-gateway --json` | Hiển thị dạng JSON |

### 2.6. Cache

| Command | Mô Tả |
|---------|-------|
| `npx nx reset` | Clear Nx cache |
| `npx nx repair` | Repair workspace |
| `npx nx daemon --stop` | Stop Nx daemon |

### 2.7. Generators

| Command | Mô Tả |
|---------|-------|
| `npx nx g @nx/nest:app new-service` | Tạo NestJS app mới |
| `npx nx g @nx/nest:lib new-lib` | Tạo NestJS library mới |
| `npx nx g @nx/nest:resource users --project=api-gateway` | Tạo CRUD resource |
| `npx nx g @nx/nest:controller users --project=api-gateway` | Tạo controller |
| `npx nx g @nx/nest:service users --project=api-gateway` | Tạo service |
| `npx nx g @nx/nest:module users --project=api-gateway` | Tạo module |

---

## 3. npm Commands

### 3.1. Dependencies

| Command | Mô Tả |
|---------|-------|
| `npm install` | Install dependencies |
| `npm install <package>` | Install package |
| `npm install -D <package>` | Install dev dependency |
| `npm uninstall <package>` | Remove package |
| `npm update` | Update packages |
| `npm audit` | Security audit |
| `npm audit fix` | Fix vulnerabilities |

### 3.2. Scripts

| Command | Mô Tả |
|---------|-------|
| `npm run build` | Run build script |
| `npm run test` | Run test script |
| `npm run lint` | Run lint script |
| `npm run format` | Run format script |

---

## 4. Docker Commands

### 4.1. Docker Compose

| Command | Mô Tả |
|---------|-------|
| `docker-compose up` | Start services |
| `docker-compose up -d` | Start in background |
| `docker-compose up --build` | Build and start |
| `docker-compose down` | Stop services |
| `docker-compose down -v` | Stop and remove volumes |
| `docker-compose logs` | View logs |
| `docker-compose logs -f` | Follow logs |
| `docker-compose logs api-gateway` | Logs của service cụ thể |
| `docker-compose ps` | List running services |
| `docker-compose restart` | Restart services |

### 4.2. Docker

| Command | Mô Tả |
|---------|-------|
| `docker build -t ecommerce-api-gateway .` | Build image |
| `docker run -p 3000:3000 ecommerce-api-gateway` | Run container |
| `docker ps` | List running containers |
| `docker images` | List images |
| `docker volume ls` | List volumes |
| `docker system prune` | Clean up |

---

## 5. Prisma Commands

### 5.1. Schema & Migrations

| Command | Mô Tả |
|---------|-------|
| `npx prisma generate` | Generate Prisma Client |
| `npx prisma db push` | Push schema to database |
| `npx prisma migrate dev` | Create and run migration |
| `npx prisma migrate deploy` | Deploy migrations (production) |
| `npx prisma migrate reset` | Reset database |

### 5.2. Studio & Debug

| Command | Mô Tả |
|---------|-------|
| `npx prisma studio` | Open Prisma Studio |
| `npx prisma db seed` | Run seed script |
| `npx prisma format` | Format schema |
| `npx prisma validate` | Validate schema |

---

## 6. Git Commands

### 6.1. Basic

| Command | Mô Tả |
|---------|-------|
| `git status` | Check status |
| `git add .` | Stage all changes |
| `git commit -m "message"` | Commit changes |
| `git push` | Push to remote |
| `git pull` | Pull from remote |

### 6.2. Branching

| Command | Mô Tả |
|---------|-------|
| `git checkout -b feature/new-feature` | Create and switch branch |
| `git checkout main` | Switch to main |
| `git merge feature/new-feature` | Merge branch |
| `git branch -d feature/new-feature` | Delete branch |

---

## 7. Quick Workflows

### 7.1. Bắt Đầu Development

```bash
# 1. Vào nix shell
nix develop

# 2. Install dependencies (nếu chưa có)
npm install

# 3. Start infrastructure
docker-compose up -d

# 4. Start service
npx nx serve api-gateway
```

### 7.2. Build Production

```bash
# Option 1: Nx build
npx nx build api-gateway --configuration=production

# Option 2: Nix build (reproducible)
nix build .#api-gateway
```

### 7.3. Run Tests Trước Commit

```bash
# Test affected projects
npx nx affected -t test

# Lint affected projects
npx nx affected -t lint

# Or run all
npx nx run-many -t test,lint
```

### 7.4. Debug Build Issues

```bash
# Clear caches
npx nx reset
rm -rf node_modules
npm install

# Verify graph
npx nx graph

# Build với verbose
npx nx build api-gateway --verbose
```

---

## 8. Environment Variables

### 8.1. Trong Nix Shell (tự động set)

| Variable | Mô Tả |
|----------|-------|
| `NODE_ENV` | development/production |
| `PRISMA_QUERY_ENGINE_LIBRARY` | Path to Prisma engine |
| `DOCKER_BUILDKIT` | Enable BuildKit |

### 8.2. Cần Set Thủ Công (.env)

| Variable | Mô Tả |
|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string |
| `RABBITMQ_URL` | RabbitMQ connection string |
| `PORT` | Application port |
