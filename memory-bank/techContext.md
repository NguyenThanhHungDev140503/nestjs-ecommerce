# Tech Context

## Technology Stack
- **Framework**: NestJS (v10.x)
- **Language**: TypeScript (v5.x)
- **Database**: PostgreSQL (v15+ implied via `pg` driver)
- **ORM**: TypeORM (v0.3.x)
- **Message Broker**: RabbitMQ
- **Environment**: Node.js
- **Containerization**: Docker, Docker Compose

## Development Setup
- **Package Manager**: NPM
- **Monorepo Tooling**: Nest CLI (`nest-cli.json`), Standard NestJS Workspace.
- **Linting/Formatting**: ESLint, Prettier.
- **Testing**: Jest, Supertest.

## Technical Constraints
- **Database**: Relational data model required.
- **Async Communication**: Must deal with eventual consistency and message handling.
- **Shared Code**: `libs/common` is a hard dependency for apps; changes here affect multiple services.

## Infrastructure (Local)
- `docker-compose.yml` provision:
    - RabbitMQ instance.
    - Postgres database instance.
    - (Optionally) the services themselves for full stack run.

## Dependencies
- `@nestjs/microservices`: For RabbitMQ connectivity.
- `@nestjs/typeorm` & `typeorm`: Database access.
- `amqp-connection-manager` & `amqplib`: RabbitMQ underlying libs.
- `class-validator` & `class-transformer`: DTO validation.
