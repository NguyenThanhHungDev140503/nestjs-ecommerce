# Progress

## Status

- **Project Structure**: Initialized with monorepo setup.
- **Core Services**:
  - `api-gateway`: Implemented with Customer/Product/Order endpoints.
  - `order-management`: Implemented with stock validation flow.
  - `customer-service`: **IMPLEMENTED** - Full CRUD + validation.
  - `inventory-service`: **IMPLEMENTED** - Full CRUD + stock reservation.
- **Infrastructure**: Docker Compose file exists for local dev.

## Accomplished

- [x] Basic project scaffolding.
- [x] API Gateway setup with routing.
- [x] RabbitMQ integration for inter-service messaging.
- [x] Database connection setup (Postgres).
- [x] Basic Order CRUD flows (Create, Update, Delete).
- [x] Call Graphs generated for all endpoints.
- [x] **Fixed DATABASE_URL quote issue** (12/23/2025)
- [x] **Added RabbitMQ retry logic** (12/23/2025)
- [x] **Added Docker health checks** (12/23/2025)
- [x] **Implemented Real Customer Service** (12/24/2025)
  - Full CRUD operations with Prisma
  - Customer validation for orders
  - Search/filter with pagination
  - Soft delete for customers with orders
- [x] **Implemented Real Inventory Service** (12/24/2025)
  - Product CRUD operations
  - Stock reservation with Prisma transactions (Serializable isolation)
  - Stock release mechanism
  - Low stock alerts
  - Availability checking
- [x] **Updated Order Management** (12/24/2025)
  - Integrated customer validation
  - Stock reservation flow on order creation
  - Stock release on order cancellation/deletion
- [x] **Added Authorization Module** (12/24/2025)
  - nest-authz with Casbin
  - RBAC model with permissions
- [x] **Added API Gateway Endpoints** (12/24/2025)
  - Customer endpoints (/api/v1/customers)
  - Product endpoints (/api/v1/products)
- [x] **Unit Tests** (12/24/2025)
  - CustomerServiceService tests
  - InventoryService tests

## Known Issues / Limitations

- [ ] Database lacks seeded data.
- [ ] Shared `libs/common` might become a bottleneck (monolith in disguise).
- [ ] Dockerfiles are simplistic.
- [x] ~~Error handling and resilience (retries, dead letter queues) are minimal.~~ → Added retry logic
- [ ] No centralized logging or monitoring.
- [x] ~~Customer and Inventory services are mocks, need real implementation.~~ → IMPLEMENTED

## Next Steps

- [ ] Run database migration: `npx prisma db push`
- [ ] Seed database with test data
- [ ] Test Docker Compose with all services
- [ ] Add E2E tests for complete order flow
- [ ] Implement event emission for low stock alerts via RabbitMQ
