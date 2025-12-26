# Cấu Hình Nx Chi Tiết

## nx.json

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "extends": "nx/presets/npm.json",
  "nxCloudId": "<YOUR_NX_CLOUD_ID>",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "sharedGlobals": ["{workspaceRoot}/tsconfig.base.json"],
    "production": [
      "default",
      "!{projectRoot}/**/*.spec.ts",
      "!{projectRoot}/test/**/*"
    ]
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true,
      "inputs": ["production", "^production"]
    },
    "test": {
      "cache": true,
      "inputs": ["default", "^production"]
    },
    "lint": {
      "cache": true,
      "inputs": ["default", "{workspaceRoot}/.eslintrc.js"]
    }
  },
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "e2e"]
      }
    }
  },
  "defaultBase": "main"
}
```

## Giải thích

| Property | Mục đích |
|----------|----------|
| `extends` | Preset cho npm/pnpm workspaces |
| `nxCloudId` | ID cho remote caching |
| `namedInputs` | Định nghĩa input sets cho caching |
| `targetDefaults.dependsOn` | `^build` = build dependencies trước |
| `cacheableOperations` | Commands được cache |
| `defaultBase` | Branch mặc định cho `affected` |

## tsconfig.base.json

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
      "@ecommerce/common": ["packages/common/src/index.ts"],
      "@ecommerce/database": ["packages/database/src/index.ts"],
      "@ecommerce/config": ["packages/config/src/index.ts"],
      "@ecommerce/rabbitmq": ["packages/rabbitmq/src/index.ts"],
      "@ecommerce/types": ["packages/types/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "dist"]
}
```

## pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```
