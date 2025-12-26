# Cấu Trúc Packages

## Overview

Chuyển đổi từ `libs/common` monolithic sang 5 packages riêng biệt:

| Package | Nội dung gốc | Dependencies |
|---------|-------------|--------------|
| `@ecommerce/database` | `libs/common/database` | Prisma, Neon |
| `@ecommerce/config` | Environment config | NestJS Config |
| `@ecommerce/rabbitmq` | `libs/common/constants` | amqplib |
| `@ecommerce/types` | `libs/common/dto`, `interfaces` | class-validator |
| `@ecommerce/common` | `libs/common/auth`, `interceptors` | NestJS Common |

---

## @ecommerce/database

```
packages/database/
├── package.json
├── tsconfig.json
├── tsconfig.lib.json
└── src/
    ├── index.ts
    ├── prisma.module.ts        # từ libs/common/database
    ├── prisma.service.ts       # từ libs/common/database
    ├── database.module.ts      # từ libs/common/database
    └── database.service.ts     # từ libs/common/database
```

**package.json**
```json
{
  "name": "@ecommerce/database",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@prisma/client": "^7.2.0",
    "@prisma/adapter-neon": "^7.2.0",
    "@neondatabase/serverless": "^1.0.2"
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0"
  }
}
```

---

## @ecommerce/config

```
packages/config/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── config.module.ts
    ├── config.service.ts
    └── validation.ts          # ENV validation với Zod
```

---

## @ecommerce/rabbitmq

```
packages/rabbitmq/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── patterns.ts            # từ libs/common/constants/patterns
    ├── services.ts            # từ libs/common/constants/services
    ├── rabbitmq.module.ts
    └── rabbitmq.service.ts
```

---

## @ecommerce/types

```
packages/types/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── dto/
    │   ├── customer/          # từ libs/common/dto/customer
    │   ├── product/           # từ libs/common/dto/product
    │   ├── order/             # các order DTOs
    │   └── common/            # standard-response.dto
    └── interfaces/
        ├── customer.interface.ts
        ├── inventory.interface.ts
        └── order.interface.ts
```

---

## @ecommerce/common

```
packages/common/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── auth/                  # từ libs/common/auth
    │   ├── guards/
    │   ├── decorators/
    │   └── strategies/
    ├── interceptors/          # từ libs/common/interceptors
    ├── filters/
    └── constants/
        ├── order-status.ts
        └── permissions.ts
```
