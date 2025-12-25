# Testing Strategy

## Tổng quan
Tài liệu này mô tả chiến lược testing toàn diện cho Notification Service, bao gồm unit tests, integration tests, end-to-end tests và performance tests.

## Testing Pyramid

```mermaid
graph TD
    A[E2E Tests] --> B[Integration Tests]
    B --> C[Unit Tests]
    
    A1[Critical User Flows] --> A
    A2[API Contract Tests] --> A
    
    B1[Database Tests] --> B
    B2[External Service Tests] --> B
    B3[Message Queue Tests] --> B
    
    C1[Service Logic] --> C
    C2[Utility Functions] --> C
    C3[Error Handling] --> C
```

## 1. Unit Tests

### 1.1 Test Configuration
```typescript
// test/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};
```

### 1.2 Test Setup
```typescript
// test/setup.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/common/prisma/prisma.module';
import { NovuModule } from '@app/common/novu/novu.module';

// Mock configuration
const mockConfig = {
  NOVU_API_KEY: 'test-api-key',
  NOVU_APP_ID: 'test-app-id',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
  REDIS_URL: 'redis://localhost:6379/1',
};

// Global test setup
beforeAll(async () => {
  // Setup test database
  await setupTestDatabase();
  
  // Setup test Redis
  await setupTestRedis();
});

afterAll(async () => {
  // Cleanup test database
  await cleanupTestDatabase();
  
  // Cleanup test Redis
  await cleanupTestRedis();
});
```

### 1.3 Service Tests
```typescript
// test/services/notification.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../src/services/notification.service';
import { NovuService } from '@app/common/novu/novu.service';
import { PrismaService } from '@app/common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('NotificationService', () => {
  let service: NotificationService;
  let novuService: jest.Mocked<NovuService>;
  let prisma: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const mockNovuService = {
      triggerWorkflow: jest.fn(),
      getSubscriber: jest.fn(),
      updateSubscriber: jest.fn(),
    };

    const mockPrismaService = {
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      notificationLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      notificationPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: NovuService,
          useValue: mockNovuService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    novuService = module.get(NovuService);
    prisma = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('sendOrderConfirmation', () => {
    it('should send order confirmation successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        customer_id: 'user-123',
        total_amount: 1000000,
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        line_items: [
          {
            product: {
              name: 'Test Product',
              unit_price: 500000,
            },
            quantity: 2,
          },
        ],
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      novuService.triggerWorkflow.mockResolvedValue({ success: true });

      const result = await service.sendOrderConfirmation('order-123');

      expect(novuService.triggerWorkflow).toHaveBeenCalledWith(
        'order-confirmation',
        'user-123',
        expect.objectContaining({
          user: {
            firstName: 'John',
            email: 'john@example.com',
          },
          order: {
            id: 'order-123',
            total: 1000000,
            items: [
              {
                name: 'Test Product',
                quantity: 2,
                price: 500000,
              },
            ],
          },
        }),
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw error when order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.sendOrderConfirmation('invalid-order'))
        .rejects.toThrow('Order not found');
    });

    it('should handle Novu API errors', async () => {
      const mockOrder = { id: 'order-123', customer_id: 'user-123' };
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      novuService.triggerWorkflow.mockRejectedValue(new Error('Novu API error'));

      await expect(service.sendOrderConfirmation('order-123'))
        .rejects.toThrow('Novu API error');
    });
  });

  describe('sendLowStockAlert', () => {
    it('should send alerts to all admin users', async () => {
      const mockAdmins = [
        { id: 'admin-1', name: 'Admin One', email: 'admin1@example.com' },
        { id: 'admin-2', name: 'Admin Two', email: 'admin2@example.com' },
      ];
      const mockProduct = {
        id: 'product-123',
        name: 'Test Product',
        low_stock_threshold: 10,
      };

      prisma.customer.findMany.mockResolvedValue(mockAdmins);
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      novuService.triggerWorkflow.mockResolvedValue({ success: true });

      await service.sendLowStockAlert('product-123', 5);

      expect(novuService.triggerWorkflow).toHaveBeenCalledTimes(2);
      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: { role: 'ADMIN' },
      });
    });
  });
});
```

### 1.4 Controller Tests
```typescript
// test/controllers/notification.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from '../src/controllers/notification.controller';
import { NotificationService } from '../src/services/notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    const mockNotificationService = {
      triggerWorkflow: jest.fn(),
      getTemplates: jest.fn(),
      getLogs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get(NotificationService);
  });

  describe('POST /notifications/trigger/:workflowId', () => {
    it('should trigger workflow successfully', async () => {
      const workflowId = 'test-workflow';
      const body = {
        userId: 'user-123',
        data: { message: 'Hello' },
      };

      service.triggerWorkflow.mockResolvedValue({ success: true });

      const result = await controller.triggerWorkflow(workflowId, body);

      expect(service.triggerWorkflow).toHaveBeenCalledWith(workflowId, body.userId, body.data);
      expect(result).toEqual({ success: true });
    });

    it('should handle validation errors', async () => {
      const workflowId = 'test-workflow';
      const body = { userId: '', data: {} };

      await expect(controller.triggerWorkflow(workflowId, body))
        .rejects.toThrow();
    });
  });
});
```

## 2. Integration Tests

### 2.1 Database Integration Tests
```typescript
// test/integration/database.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@app/common/prisma/prisma.service';
import { NotificationService } from '../../src/services/notification.service';

describe('Database Integration', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let service: NotificationService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [NotificationService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    service = module.get<NotificationService>(NotificationService);
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.notificationLog.deleteMany();
    await prisma.notificationPreference.deleteMany();
    await prisma.notificationTemplate.deleteMany();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should create and retrieve notification logs', async () => {
    const logData = {
      templateKey: 'test-template',
      channel: 'email',
      status: 'sent',
      recipient: 'test@example.com',
      payload: { message: 'Test message' },
    };

    const created = await prisma.notificationLog.create({
      data: logData,
    });

    expect(created.id).toBeDefined();
    expect(created.templateKey).toBe(logData.templateKey);
    expect(created.status).toBe(logData.status);

    const retrieved = await prisma.notificationLog.findUnique({
      where: { id: created.id },
    });

    expect(retrieved).toEqual(created);
  });

  it('should handle user preferences', async () => {
    const preferences = {
      email: true,
      sms: false,
      push: true,
      inApp: false,
      globalOptOut: false,
    };

    const created = await prisma.notificationPreference.upsert({
      where: { userId: 'user-123' },
      update: { preferences },
      create: { userId: 'user-123', preferences },
    });

    expect(created.userId).toBe('user-123');
    expect(created.preferences).toEqual(preferences);
  });
});
```

### 2.2 Novu Integration Tests
```typescript
// test/integration/novu.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NovuService } from '@app/common/novu/novu.service';

describe('Novu Integration', () => {
  let service: NovuService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [NovuModule],
    }).compile();

    service = module.get<NovuService>(NovuService);
  });

  it('should connect to Novu API', async () => {
    // Test actual Novu API connection
    // Use test API key and environment
    const result = await service.getSubscriber('test-subscriber');
    expect(result).toBeDefined();
  });

  it('should trigger workflow', async () => {
    const result = await service.triggerWorkflow(
      'test-workflow',
      'test-subscriber',
      { message: 'Test message' },
    );

    expect(result.success).toBe(true);
  });
});
```

## 3. End-to-End Tests

### 3.1 API Contract Tests
```typescript
// test/e2e/api.contract.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('API Contract Tests (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /notifications/send', () => {
    it('should send notification with valid data', () => {
      const notificationData = {
        templateKey: 'order-confirmation',
        recipient: 'user-123',
        data: {
          orderId: 'order-123',
          orderTotal: 1000000,
        },
      };

      return request(app.getHttpServer())
        .post('/notifications/send')
        .send(notificationData)
        .expect(202)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.notificationId).toBeDefined();
        });
    });

    it('should return 400 for invalid data', () => {
      const invalidData = {
        templateKey: '',
        recipient: '',
        data: {},
      };

      return request(app.getHttpServer())
        .post('/notifications/send')
        .send(invalidData)
        .expect(400);
    });

    it('should return 401 without authentication', () => {
      const notificationData = {
        templateKey: 'order-confirmation',
        recipient: 'user-123',
        data: {},
      };

      return request(app.getHttpServer())
        .post('/notifications/send')
        .send(notificationData)
        .expect(401);
    });
  });

  describe('GET /notifications/templates', () => {
    it('should return list of templates', () => {
      return request(app.getHttpServer())
        .get('/notifications/templates')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toBeDefined();
        });
    });
  });
});
```

### 3.2 Workflow Tests
```typescript
// test/e2e/workflow.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Workflow Tests (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should complete order confirmation workflow', async () => {
    // Step 1: Create order
    const orderResponse = await request(app.getHttpServer())
      .post('/orders')
      .send({
        customerId: 'user-123',
        items: [
          { productId: 'product-1', quantity: 2 },
        ],
      })
      .expect(201);

    const orderId = orderResponse.body.id;

    // Step 2: Check if notification was sent
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for async processing

    const notificationLogs = await request(app.getHttpServer())
      .get('/notifications/history')
      .query({ userId: 'user-123' })
      .expect(200);

    const orderNotification = notificationLogs.body.data.find(
      (log: any) => log.templateKey === 'order-confirmation'
    );

    expect(orderNotification).toBeDefined();
    expect(orderNotification.status).toBe('sent');
  });
});
```

## 4. Performance Tests

### 4.1 Load Testing
```typescript
// test/performance/load.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Performance Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() =>
      request(app.getHttpServer())
        .post('/notifications/send')
        .send({
          templateKey: 'test-template',
          recipient: `user-${Math.random()}`,
          data: { message: 'Test' },
        })
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const endTime = Date.now();

    const successCount = responses.filter(res => res.status === 202).length;
    const totalTime = endTime - startTime;
    const avgResponseTime = totalTime / requests.length;

    expect(successCount).toBeGreaterThan(95); // 95% success rate
    expect(avgResponseTime).toBeLessThan(1000); // < 1s average response time
  });

  it('should handle 1000 requests over 10 seconds', async () => {
    const startTime = Date.now();
    let successCount = 0;

    for (let i = 0; i < 1000; i++) {
      try {
        await request(app.getHttpServer())
          .post('/notifications/send')
          .send({
            templateKey: 'test-template',
            recipient: `user-${i}`,
            data: { message: 'Test' },
          });
        successCount++;
      } catch (error) {
        // Handle errors
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    expect(totalTime).toBeLessThan(10000); // < 10 seconds
    expect(successCount).toBeGreaterThan(950); // 95% success rate
  });
});
```

### 4.2 Memory Tests
```typescript
// test/performance/memory.spec.ts
describe('Memory Tests', () => {
  it('should not leak memory during high load', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Simulate high load
    for (let i = 0; i < 10000; i++) {
      // Create and process notifications
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 100MB)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });
});
```

## 5. Test Data Management

### 5.1 Test Fixtures
```typescript
// test/fixtures/notification.fixtures.ts
export const createOrderFixture = () => ({
  id: 'order-123',
  customer_id: 'user-123',
  total_amount: 1000000,
  status: 'PROCESSING',
  customer: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  },
  line_items: [
    {
      product: {
        name: 'Test Product',
        unit_price: 500000,
      },
      quantity: 2,
    },
  ],
});

export const createTemplateFixture = () => ({
  key: 'order-confirmation',
  name: 'Order Confirmation',
  description: 'Sent when order is created',
  workflowId: 'order-confirmation-workflow',
  active: true,
});

export const createPreferenceFixture = () => ({
  userId: 'user-123',
  preferences: {
    email: true,
    sms: false,
    push: true,
    inApp: true,
    globalOptOut: false,
  },
});
```

### 5.2 Test Database Setup
```typescript
// test/utils/test-database.ts
import { PrismaService } from '@app/common/prisma/prisma.service';

export class TestDatabase {
  constructor(private readonly prisma: PrismaService) {}

  async setup() {
    // Create test database schema
    await this.prisma.$executeRaw`
      CREATE DATABASE IF NOT EXISTS notification_test;
    `;
    
    // Run migrations
    await this.prisma.$executeRaw`
      USE notification_test;
    `;
  }

  async cleanup() {
    // Clean up all test data
    await this.prisma.notificationLog.deleteMany();
    await this.prisma.notificationPreference.deleteMany();
    await this.prisma.notificationTemplate.deleteMany();
  }

  async reset() {
    await this.cleanup();
    await this.setup();
  }
}
```

## 6. Test Utilities

### 6.1 Mock Helpers
```typescript
// test/utils/mock-helpers.ts
export const createMockNovuService = () => ({
  triggerWorkflow: jest.fn(),
  getSubscriber: jest.fn(),
  updateSubscriber: jest.fn(),
});

export const createMockPrismaService = () => ({
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  notificationLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  notificationPreference: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
});

export const createMockEventEmitter = () => ({
  emit: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
});
```

### 6.2 Test Assertions
```typescript
// test/utils/assertions.ts
export const expectNotificationSent = (mockNovuService: any, templateKey: string, userId: string) => {
  expect(mockNovuService.triggerWorkflow).toHaveBeenCalledWith(
    templateKey,
    userId,
    expect.any(Object),
  );
};

export const expectErrorLogged = (mockPrismaService: any, templateKey: string) => {
  expect(mockPrismaService.notificationLog.create).toHaveBeenCalledWith(
    expect.objectContaining({
      templateKey,
      status: 'failed',
      error: expect.any(String),
    }),
  );
};
```

## 7. Continuous Integration

### 7.1 GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Notification Service

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_USER: test
          POSTGRES_DB: notification_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run unit tests
      run: npm run test:unit

    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/notification_test
        REDIS_URL: redis://localhost:6379

    - name: Run e2e tests
      run: npm run test:e2e
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/notification_test
        REDIS_URL: redis://localhost:6379

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

## 8. Best Practices

### 8.1 Test Organization
- Group tests by feature
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent

### 8.2 Test Data
- Use fixtures for reusable test data
- Clean up test data after each test
- Use factories for complex objects
- Avoid hard-coded values

### 8.3 Mock Strategy
- Mock external dependencies
- Use realistic mock responses
- Test both success and failure cases
- Verify mock interactions

### 8.4 Performance
- Run tests in parallel when possible
- Use test databases with indexes
- Optimize test setup and teardown
- Monitor test execution time
