# Hướng Dẫn Migrate Nx Từng Bước

> Hướng dẫn chi tiết từng bước để migrate từ NestJS CLI Monorepo sang Nx Workspace.

## 1. Chuẩn Bị

### 1.1. Backup Project

```bash
# Tạo backup branch
git checkout -b backup/pre-nx-migration
git push origin backup/pre-nx-migration

# Quay lại main
git checkout main
git checkout -b feature/nx-migration
```

### 1.2. Chuyển từ Yarn sang npm

```bash
# Xóa yarn artifacts
rm yarn.lock
rm -rf node_modules

# Tạo package-lock.json
npm install

# Verify
npm ls --depth=0
```

---

## 2. Initialize Nx

### 2.1. Thêm Nx vào Project

```bash
# Vào nix shell trước
nix develop

# Initialize Nx
npx nx@latest init

# Hoặc install thủ công
npm install -D nx @nx/nest @nx/js @nx/webpack @nx/eslint @nx/jest
```

### 2.2. Tạo nx.json

Tạo file `nx.json` tại root:

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"]
    },
    "test": {
      "cache": true,
      "inputs": ["default", "^production"]
    },
    "lint": {
      "cache": true,
      "inputs": ["default"]
    },
    "serve": {
      "cache": false
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/*.spec.ts",
      "!{projectRoot}/test/**/*",
      "!{projectRoot}/.eslintrc.json"
    ],
    "sharedGlobals": [
      "{workspaceRoot}/tsconfig.base.json",
      "{workspaceRoot}/prisma/schema.prisma"
    ]
  },
  "plugins": [
    "@nx/eslint/plugin",
    {
      "plugin": "@nx/nest/plugin",
      "options": {
        "buildTargetName": "build",
        "serveTargetName": "serve"
      }
    }
  ],
  "defaultBase": "main",
  "workspaceLayout": {
    "appsDir": "apps",
    "libsDir": "libs"
  }
}
```

---

## 3. Tạo project.json cho Applications

### 3.1. apps/api-gateway/project.json

```json
{
  "name": "api-gateway",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "sourceRoot": "apps/api-gateway/src",
  "tags": ["scope:gateway", "type:app"],
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "outputs": ["{options.outputPath}"],
      "options": {
        "target": "node",
        "compiler": "tsc",
        "outputPath": "dist/apps/api-gateway",
        "main": "apps/api-gateway/src/main.ts",
        "tsConfig": "apps/api-gateway/tsconfig.app.json",
        "assets": [],
        "generatePackageJson": true
      },
      "configurations": {
        "production": {
          "optimization": true,
          "extractLicenses": true,
          "inspect": false
        },
        "development": {
          "optimization": false,
          "extractLicenses": false,
          "inspect": true
        }
      },
      "defaultConfiguration": "production"
    },
    "serve": {
      "executor": "@nx/js:node",
      "options": {
        "buildTarget": "api-gateway:build:development",
        "watch": true
      },
      "configurations": {
        "production": {
          "buildTarget": "api-gateway:build:production"
        }
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/apps/api-gateway"],
      "options": {
        "jestConfig": "apps/api-gateway/jest.config.ts",
        "passWithNoTests": true
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["apps/api-gateway/**/*.ts"]
      }
    }
  }
}
```

### 3.2. apps/order-management/project.json

```json
{
  "name": "order-management",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "sourceRoot": "apps/order-management/src",
  "tags": ["scope:order", "type:app"],
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "outputs": ["{options.outputPath}"],
      "options": {
        "target": "node",
        "compiler": "tsc",
        "outputPath": "dist/apps/order-management",
        "main": "apps/order-management/src/main.ts",
        "tsConfig": "apps/order-management/tsconfig.app.json",
        "assets": [],
        "generatePackageJson": true
      },
      "configurations": {
        "production": {
          "optimization": true
        },
        "development": {
          "optimization": false
        }
      },
      "defaultConfiguration": "production"
    },
    "serve": {
      "executor": "@nx/js:node",
      "options": {
        "buildTarget": "order-management:build:development",
        "watch": true
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/apps/order-management"],
      "options": {
        "jestConfig": "apps/order-management/jest.config.ts",
        "passWithNoTests": true
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["apps/order-management/**/*.ts"]
      }
    }
  }
}
```

### 3.3. Template cho các Services khác

Tạo tương tự cho:
- `apps/customer-service/project.json`
- `apps/inventory-service/project.json`
- `apps/notification-service/project.json`

Chỉ cần thay đổi:
- `name`
- `sourceRoot`
- `tags` (scope tương ứng)
- `outputPath`
- `main`
- `tsConfig`

---

## 4. Tạo project.json cho Library

### 4.1. libs/common/project.json

```json
{
  "name": "common",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "library",
  "sourceRoot": "libs/common",
  "tags": ["scope:shared", "type:lib"],
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/common",
        "main": "libs/common/index.ts",
        "tsConfig": "libs/common/tsconfig.lib.json",
        "assets": []
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["libs/common/**/*.ts"]
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/libs/common"],
      "options": {
        "jestConfig": "libs/common/jest.config.ts",
        "passWithNoTests": true
      }
    }
  }
}
```

---

## 5. Update Path Aliases

### 5.1. Tạo tsconfig.base.json

Tạo file `tsconfig.base.json` tại root:

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "ES2021",
    "module": "commonjs",
    "lib": ["ES2021"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@ecommerce/common": ["libs/common/index.ts"],
      "@ecommerce/common/*": ["libs/common/*"]
    }
  },
  "exclude": ["node_modules", "dist"]
}
```

### 5.2. Update tsconfig.json

Update file `tsconfig.json` để extend từ base:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "incremental": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  }
}
```

### 5.3. Update Imports trong Code

```bash
# Tìm tất cả imports cũ
grep -r "@app/common" apps/ libs/

# Replace imports
# Trước: import { xyz } from '@app/common';
# Sau:   import { xyz } from '@ecommerce/common';
```

Sử dụng IDE hoặc script để replace:

```bash
# Sử dụng sed (Linux/Mac)
find apps libs -name "*.ts" -exec sed -i 's/@app\/common/@ecommerce\/common/g' {} \;
```

---

## 6. Setup Module Boundaries (Optional nhưng Recommended)

### 6.1. Update .eslintrc.json

Thêm vào root `.eslintrc.json`:

```json
{
  "root": true,
  "ignorePatterns": ["**/*"],
  "plugins": ["@nx"],
  "overrides": [
    {
      "files": ["*.ts", "*.tsx", "*.js", "*.jsx"],
      "rules": {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            "enforceBuildableLibDependency": true,
            "allow": [],
            "depConstraints": [
              {
                "sourceTag": "type:app",
                "onlyDependOnLibsWithTags": ["type:lib"]
              },
              {
                "sourceTag": "scope:gateway",
                "onlyDependOnLibsWithTags": ["scope:shared", "scope:order", "scope:customer", "scope:inventory"]
              },
              {
                "sourceTag": "scope:shared",
                "onlyDependOnLibsWithTags": ["scope:shared"]
              }
            ]
          }
        ]
      }
    }
  ]
}
```

---

## 7. Xóa nest-cli.json (Optional)

Sau khi migration hoàn tất, bạn có thể xóa `nest-cli.json` vì Nx sẽ quản lý projects:

```bash
# Backup trước
mv nest-cli.json nest-cli.json.bak

# Sau khi verify mọi thứ hoạt động, xóa
rm nest-cli.json.bak
```

---

## 8. Verification

### 8.1. Verify Nx Graph

```bash
# Mở dependency graph
npx nx graph
```

### 8.2. Verify Build

```bash
# Build một service
npx nx build api-gateway

# Build tất cả
npx nx run-many -t build
```

### 8.3. Verify Affected Commands

```bash
# Xem projects bị ảnh hưởng
npx nx affected:graph

# Test affected
npx nx affected -t test
```

### 8.4. Verify Serve

```bash
# Chạy một service
npx nx serve api-gateway

# Chạy nhiều services
npx nx run-many -t serve -p api-gateway,order-management
```

---

## 9. Update package.json Scripts

```json
{
  "scripts": {
    "build": "nx run-many -t build",
    "build:api-gateway": "nx build api-gateway",
    "build:order-management": "nx build order-management",
    "serve:api-gateway": "nx serve api-gateway",
    "serve:order-management": "nx serve order-management",
    "test": "nx run-many -t test",
    "test:affected": "nx affected -t test",
    "lint": "nx run-many -t lint",
    "lint:affected": "nx affected -t lint",
    "graph": "nx graph",
    "affected": "nx affected"
  }
}
```

---

## 10. Commit Changes

```bash
git add .
git commit -m "feat: migrate to Nx workspace

- Initialize Nx with @nx/nest plugin
- Create project.json for all services
- Update path aliases from @app/common to @ecommerce/common
- Setup module boundaries with ESLint
- Remove nest-cli.json in favor of Nx"

git push origin feature/nx-migration
```

---

## 11. Tham Khảo

- [Nx NestJS Plugin](https://nx.dev/packages/nest)
- [Nx Migration Guide](https://nx.dev/recipes/adopting-nx/adding-to-existing-project)
- [Enforce Module Boundaries](https://nx.dev/features/enforce-module-boundaries)
