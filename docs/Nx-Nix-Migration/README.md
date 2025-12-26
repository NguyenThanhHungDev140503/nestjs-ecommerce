# Nx + Nix Migration Guide

> Hướng dẫn toàn diện về việc migrate dự án nestjs-ecommerce sang Nx Workspace và thiết lập Nix Shell chuẩn best practices.

## 📚 Cấu Trúc Tài Liệu

| File | Mô Tả | Đối Tượng |
|------|-------|-----------|
| [01-Analysis.md](./01-Analysis.md) | Phân tích tại sao cần Nx + Nix | Tất cả |
| [02-Nix-Flake-Guide.md](./02-Nix-Flake-Guide.md) | Hướng dẫn Nix Flake chi tiết | DevOps/Senior |
| [03-Nx-Migration-Guide.md](./03-Nx-Migration-Guide.md) | Hướng dẫn migrate Nx từng bước | Developer |
| [04-Commands-Cheatsheet.md](./04-Commands-Cheatsheet.md) | Các commands thường dùng | Tất cả |
| [05-Rollback-Plan.md](./05-Rollback-Plan.md) | Kế hoạch rollback nếu có vấn đề | DevOps |

---

## 🎯 Mục Tiêu Migration

### Trước Migration
```
nestjs-ecommerce/
├── nest-cli.json        # NestJS CLI monorepo
├── flake.nix            # Basic devShell only
├── yarn.lock            # Yarn package manager
└── apps/ + libs/        # Standard NestJS structure
```

### Sau Migration
```
nestjs-ecommerce/
├── nx.json              # Nx workspace config
├── flake.nix            # Full outputs: devShells, packages, apps
├── package-lock.json    # npm for Nix integration
├── apps/
│   └── */project.json   # Nx project configs
└── libs/
    └── */project.json   # Nx library configs
```

---

## 🚀 Quick Start

### 1. Vào Development Shell
```bash
# Vào nix shell
nix develop

# Hoặc với direnv (tự động)
direnv allow
```

### 2. Cài đặt Dependencies
```bash
npm install
```

### 3. Xem Dependency Graph
```bash
npx nx graph
```

### 4. Build Service
```bash
# Build với Nx
npx nx build api-gateway

# Hoặc build với Nix (reproducible)
nix build .#api-gateway
```

### 5. Run Service
```bash
# Run với Nx
npx nx serve api-gateway

# Hoặc run với Nix
nix run .#api-gateway
```

---

## 📊 Lợi Ích Sau Migration

| Lợi Ích | Mô Tả |
|---------|-------|
| **Reproducible Builds** | Nix đảm bảo build giống nhau mọi nơi |
| **Affected Commands** | Chỉ build/test những phần bị ảnh hưởng |
| **Computation Caching** | Cache kết quả build, giảm thời gian CI/CD |
| **Dependency Graph** | Visualize mối quan hệ giữa projects |
| **Module Boundaries** | ESLint tự động enforce architecture rules |
| **Isolated Environment** | Tất cả tools trong Nix shell, không conflict |

---

## 🔗 External Resources

- [Nx Official Documentation](https://nx.dev/docs)
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [Nixpkgs JavaScript Manual](https://nixos.org/manual/nixpkgs/stable/#language-javascript)
- [NixOS Wiki - Flakes](https://wiki.nixos.org/wiki/Flakes)
- [buildNpmPackage Guide](https://ryantm.github.io/nixpkgs/languages-frameworks/javascript/)

---

## 📝 Changelog

| Ngày | Thay Đổi |
|------|----------|
| 2025-12-26 | Initial migration plan created |
