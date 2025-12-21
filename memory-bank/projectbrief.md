# Project Brief

## Core Requirements
- **Microservices Architecture**: Build a scalable e-commerce backend using NestJS microservices.
- **Interservice Communication**: Use RabbitMQ for asynchronous communication between services.
- **Data Persistence**: Use PostgreSQL with TypeORM for robust data management.
- **Gateway**: Implement an API Gateway as the single entry point for external requests.

## Project Goals
- **Scalability**: Design to handle high volumes of traffic and orders (millions).
- **Modularity**: Use a monorepo structure to share code and simplify maintenance.
- **Reliability**: Ensure data consistency and integrity using ACID-compliant relational database transactions.

## Project Scope
1.  **API Gateway**: Listens to HTTP requests, handles auth (mocked), and forwards to microservices.
2.  **Order Management Service**: Core logic for processing orders, interacting with DB and other services.
3.  **Customer Service**: provides customer details (currently mocked).
4.  **Inventory Service**: Manages product stock (currently mocked).

## Key Features
- Order Creation, Update, and Deletion flows.
- Event-driven architecture using RabbitMQ.
- Shared libraries for DTOs, interfaces, and constants.
