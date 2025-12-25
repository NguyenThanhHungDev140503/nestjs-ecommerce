# Active Context

## Current Focus (Updated 12/24/2025)

✅ **COMPLETED**: Implemented Real Customer Service & Inventory Service

## Recent Changes (12/24/2025)

**Phase: Infrastructure Strengthening**

### 1. RabbitMQ Configuration Fix
- Analyzed and identified queue name mismatch between Gateway and Services.
- **Fixed**: Updated `CustomerModule` and `ProductModule` in API Gateway to use `*-info-queue` matching Consumer services.
- **Improved**: Ensured `.env.development` variables are correctly used with valid fallbacks.

**Phase: Real Customer & Inventory Services Implementation**

### 1. Database Schema Updates
- Added new enums: `CustomerRole`, `CustomerStatus`, `StockReservationStatus`
- Extended `Customer` model: `password_hash`, `role`, `status`, relation to `Order`
- Extended `Product` model: `reserved_quantity`, `low_stock_threshold`, `is_active`
- Added new model: `StockReservation` for tracking stock reservations

### 2. Shared Libraries (libs/common)
- Created DTOs: `CreateCustomerDto`, `UpdateCustomerDto`, `CustomerQueryDto`
- Created DTOs: `CreateProductDto`, `UpdateProductDto`, `ReserveStockDto`, `ReleaseStockDto`, `CheckAvailabilityDto`
- Updated interfaces: `CustomerDetails`, `InventoryItem`, `ProductDetails`
- Added new interfaces: `CustomerValidationResult`, `StockReservationResult`, `StockReleaseResult`, `LowStockAlert`
- Extended message patterns: Customer CRUD, Inventory CRUD, Stock reservation
- Added authorization module with nest-authz (Casbin)

### 3. Customer Service
- Full CRUD implementation with database persistence
- Customer validation for order creation
- Soft delete for customers with orders
- Search/filter functionality with pagination

### 4. Inventory Service
- Full CRUD implementation for products
- Stock reservation with Prisma transactions (Serializable isolation)
- Stock release mechanism
- Low stock alert logging
- Availability checking

### 5. Order Management Integration
- Updated to validate customer before order creation
- Integrated stock reservation flow
- Handle inventory unavailability with proper error messages
- Stock release on order cancellation/deletion

### 6. API Gateway
- Added Customer endpoints (/api/v1/customers)
- Added Product endpoints (/api/v1/products)
- Updated Swagger documentation

### 7. Testing
- Unit tests for CustomerServiceService
- Unit tests for InventoryService

## Technical Decisions

### Authorization with nest-authz (Casbin)
- Model: RBAC with action-based permissions
- Roles: customer, admin
- Resources: customer, order, product, inventory
- Possession: own (user's resources) vs any (all resources)

### Stock Reservation Strategy
- Use Prisma interactive transactions with Serializable isolation
- StockReservation model tracks pending/confirmed/released reservations
- `reserved_quantity` field on Product for quick availability check
- Automatic release on order cancellation

### Customer Soft Delete
- If customer has orders: set status to INACTIVE
- If customer has no orders: hard delete

## Next Steps

- [ ] Run database migration: `npx prisma db push` or `npx prisma migrate dev`
- [ ] Seed database with test data
- [ ] Test Docker Compose with all services
- [ ] Add E2E tests for complete order flow
- [ ] Implement event emission for low stock alerts (RabbitMQ)
- All `depends_on`: Changed from simple list to `condition: service_healthy`

**Files Modified**:

- apps/order-management/src/main.ts
- apps/customer-service/src/main.ts
- apps/inventory-service/src/main.ts
- apps/api-gateway/src/order-management/order-management.module.ts
- apps/order-management/src/order-management.module.ts
- docker-compose.yml
- .env.development

## Next Steps

- Test Docker Compose startup sequence (healthcheck should work)
- Verify no ECONNREFUSED errors on first start
- Test RabbitMQ message routing between services
- Implement real logic for customer-service and inventory-service mocks

## Active Decisions

- Using Docker health checks + service_healthy conditions (Docker Compose 3.8+)
- maxConnectionAttempts: 5 with reconnectTimeInSeconds: 5
- RabbitMQ health check uses `rabbitmq-diagnostics -q ping`
- start_period: 30s to allow RabbitMQ process startup time
