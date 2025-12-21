# System Patterns

## Architecture
- **Monorepo**: Uses NestJS standard monorepo mode (`apps/` and `libs/`).
- **Microservices**:
    - `api-gateway`: Entry point, HTTP REST API.
    - `order-management`: Consumer of order events/commands.
    - `customer-service`: Mocked service for customer data.
    - `inventory-service`: Mocked service for inventory data.
- **Inter-service Communication**:
    - **Transport**: RabbitMQ.
    - **Patterns**:
        - Fire-and-Forget (Event Emitting) for Order Creation.
        - Request-Response (RPC-style or Producer-Consumer) for Updates/Deletes and data retrieval (e.g., Inventory check).

## Design Patterns
- **DTOs (Data Transfer Objects)**: Shared in `libs/common` to ensure consistent data structures across services.
- **Repository Pattern**: Used via TypeORM to abstract database access.
- **Gateway Pattern**: API Gateway abstracts the underlying microservices from external clients.
- **Mocking**: Used for Customer and Inventory services to simulate external dependency behavior.

## Component Relationships
- `API Gateway` $\rightarrow$ `RabbitMQ` $\rightarrow$ `Order Management`
- `Order Management` $\leftrightarrow$ `RabbitMQ` $\leftrightarrow$ `Inventory Service`
- `Order Management` $\leftrightarrow$ `RabbitMQ` $\leftrightarrow$ `Customer Service`
- `Order Management` $\rightarrow$ `PostgreSQL`

## Directory Structure
- `apps/`: Contains the executable service applications.
- `libs/`: Contains shared code (`common`).
    - `common/src/dto`: Shared DTOs.
    - `common/src/database`: Shared database modules/config.
