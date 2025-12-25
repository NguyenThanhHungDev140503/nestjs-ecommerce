# Service Implementation

## Tổng quan
Tài liệu này mô tả chi tiết việc triển khai các service chính cho Notification Service với Novu integration.

## Core Services

### 1. NovuService
```typescript
// libs/common/src/novu/novu.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Novu } from '@novu/api';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NovuService implements OnModuleInit {
  private novu: Novu;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.novu = new Novu({
      secretKey: this.configService.get<string>('NOVU_API_KEY'),
    });
  }

  async triggerWorkflow(
    workflowId: string,
    subscriberId: string,
    payload: Record<string, any>,
    overrides: Record<string, any> = {},
  ) {
    try {
      // Get user preferences
      const preferences = await this.prisma.notificationPreference.findUnique({
        where: { userId: subscriberId },
      });

      // Check if user has opted out
      if (preferences?.preferences?.globalOptOut) {
        return { success: false, message: 'User has opted out of notifications' };
      }

      // Trigger the workflow
      const result = await this.novu.trigger({
        workflowId,
        to: {
          subscriberId,
          ...payload.user,
        },
        payload: {
          ...payload,
          preferences: preferences?.preferences,
        },
        overrides,
      });

      // Log the notification
      await this.prisma.notificationLog.create({
        data: {
          templateKey: workflowId,
          channel: 'multi',
          status: 'pending',
          recipient: subscriberId,
          payload,
        },
      });

      return { success: true, data: result.data };
    } catch (error) {
      // Log error
      await this.prisma.notificationLog.create({
        data: {
          templateKey: workflowId,
          channel: 'multi',
          status: 'failed',
          recipient: subscriberId,
          payload,
          error: error.message,
        },
      });
      throw error;
    }
  }

  async getSubscriber(subscriberId: string) {
    return this.novu.subscribers.get(subscriberId);
  }

  async updateSubscriber(subscriberId: string, data: any) {
    return this.novu.subscribers.identify(subscriberId, data);
  }
}
```

### 2. NotificationService
```typescript
// apps/notification-service/src/services/notification.service.ts
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@app/common/prisma/prisma.service';
import { NovuService } from '@app/common/novu/novu.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly novuService: NovuService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async sendOrderConfirmation(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        line_items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return this.novuService.triggerWorkflow(
      'order-confirmation',
      order.customer_id,
      {
        user: {
          firstName: order.customer.name?.split(' ')[0] || 'Customer',
          email: order.customer.email,
        },
        order: {
          id: order.id,
          total: order.total_amount,
          items: order.line_items.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.unit_price,
          })),
        },
      },
    );
  }

  async sendShippingUpdate(orderId: string, update: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return this.novuService.triggerWorkflow(
      'shipping-update',
      order.customer_id,
      {
        user: {
          firstName: order.customer.name?.split(' ')[0] || 'Customer',
          email: order.customer.email,
        },
        order: {
          id: order.id,
          trackingNumber: update.trackingNumber,
          trackingCompany: update.trackingCompany,
          status: update.status,
        },
      },
    );
  }

  async sendAbandonedCartReminder(userId: string, cartItems: any[]) {
    return this.novuService.triggerWorkflow(
      'abandoned-cart',
      userId,
      {
        cartItems,
        reminderCount: cartItems.length,
      },
    );
  }

  async sendLowStockAlert(productId: string, currentStock: number) {
    // Send to admin users
    const adminUsers = await this.prisma.customer.findMany({
      where: { role: 'ADMIN' },
    });

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const promises = adminUsers.map(user => 
      this.novuService.triggerWorkflow(
        'low-stock-alert',
        user.id,
        {
          user: {
            firstName: user.name?.split(' ')[0] || 'Admin',
            email: user.email,
          },
          product: {
            id: product.id,
            name: product.name,
            currentStock,
            threshold: product.low_stock_threshold,
          },
        },
      )
    );

    return Promise.allSettled(promises);
  }
}
```

### 3. Event Handlers
```typescript
// apps/notification-service/src/events/order-events.handler.ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderCreatedEvent } from '../events/order-created.event';
import { OrderShippedEvent } from '../events/order-shipped.event';
import { NotificationService } from '../services/notification.service';

@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(event: OrderCreatedEvent) {
    await this.notificationService.sendOrderConfirmation(event.orderId);
  }
}

@EventsHandler(OrderShippedEvent)
export class OrderShippedHandler implements IEventHandler<OrderShippedEvent> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(event: OrderShippedEvent) {
    await this.notificationService.sendShippingUpdate(event.orderId, event.update);
  }
}

// apps/notification-service/src/events/inventory-events.handler.ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { LowStockEvent } from '../events/low-stock.event';
import { NotificationService } from '../services/notification.service';

@EventsHandler(LowStockEvent)
export class LowStockHandler implements IEventHandler<LowStockEvent> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(event: LowStockEvent) {
    await this.notificationService.sendLowStockAlert(
      event.productId,
      event.currentStock,
    );
  }
}
```

### 4. User Preference Service
```typescript
// apps/notification-service/src/services/user-preference.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/common/prisma/prisma.service';

@Injectable()
export class UserPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPreferences(userId: string) {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    return preferences?.preferences || {
      email: true,
      sms: true,
      push: true,
      inApp: true,
      globalOptOut: false,
    };
  }

  async updateUserPreferences(userId: string, preferences: any) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        preferences,
        updatedAt: new Date(),
      },
      create: {
        userId,
        preferences,
      },
    });
  }

  async unsubscribe(userId: string, channel?: string) {
    const current = await this.getUserPreferences(userId);
    
    if (channel) {
      current[channel] = false;
    } else {
      current.globalOptOut = true;
    }

    return this.updateUserPreferences(userId, current);
  }

  async resubscribe(userId: string, channel?: string) {
    const current = await this.getUserPreferences(userId);
    
    if (channel) {
      current[channel] = true;
    } else {
      current.globalOptOut = false;
    }

    return this.updateUserPreferences(userId, current);
  }
}
```

## Module Configuration

### 1. Novu Module
```typescript
// libs/common/src/novu/novu.module.ts
import { Global, Module } from '@nestjs/common';
import { NovuService } from './novu.service';

@Global()
@Module({
  providers: [NovuService],
  exports: [NovuService],
})
export class NovuModule {}
```

### 2. Notification Module
```typescript
// apps/notification-service/src/notification.module.ts
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationService } from './services/notification.service';
import { UserPreferenceService } from './services/user-preference.service';
import { NovuModule } from '@app/common/novu/novu.module';
import { PrismaModule } from '@app/common/prisma/prisma.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    NovuModule,
    PrismaModule,
  ],
  providers: [NotificationService, UserPreferenceService],
  exports: [NotificationService, UserPreferenceService],
})
export class NotificationModule {}
```

## Error Handling

### 1. Custom Exceptions
```typescript
// apps/notification-service/src/exceptions/notification.exceptions.ts
export class NotificationException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'NotificationException';
  }
}

export class NovuException extends NotificationException {
  constructor(message: string, originalError?: any) {
    super(message, 'NOVU_ERROR', 502);
    this.originalError = originalError;
  }
}

export class TemplateNotFoundException extends NotificationException {
  constructor(templateKey: string) {
    super(`Template not found: ${templateKey}`, 'TEMPLATE_NOT_FOUND', 404);
  }
}
```

### 2. Global Exception Filter
```typescript
// apps/notification-service/src/filters/notification-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class NotificationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(NotificationExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    const errorResponse = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.error(
      `HTTP Exception: ${message}`,
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(status).json(errorResponse);
  }
}
```

## Performance Optimization

### 1. Caching
```typescript
// apps/notification-service/src/decorators/cache.decorator.ts
import { CacheInterceptor } from '@nestjs/cache-manager';

export class NotificationCacheInterceptor extends CacheInterceptor {
  protected isRequestCacheable(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    return request.method === 'GET';
  }
}
```

### 2. Rate Limiting
```typescript
// apps/notification-service/src/guards/rate-limit.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RateLimitService } from '../services/rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip;
    
    return this.rateLimitService.checkLimit(userId, 'notification_send');
  }
}
```

## Testing Strategy

### 1. Unit Tests
```typescript
// apps/notification-service/test/notification.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../src/services/notification.service';
import { NovuService } from '@app/common/novu/novu.service';
import { PrismaService } from '@app/common/prisma/prisma.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let novuService: jest.Mocked<NovuService>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: NovuService,
          useValue: {
            triggerWorkflow: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            order: { findUnique: jest.fn() },
            notificationLog: { create: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    novuService = module.get(NovuService);
    prisma = module.get(PrismaService);
  });

  it('should send order confirmation', async () => {
    const mockOrder = { id: 'order-123', customer_id: 'user-123' };
    prisma.order.findUnique.mockResolvedValue(mockOrder);
    novuService.triggerWorkflow.mockResolvedValue({ success: true });

    await service.sendOrderConfirmation('order-123');

    expect(novuService.triggerWorkflow).toHaveBeenCalledWith(
      'order-confirmation',
      'user-123',
      expect.any(Object),
    );
  });
});
```

## Monitoring và Logging

### 1. Custom Metrics
```typescript
// apps/notification-service/src/metrics/notification.metrics.ts
import { Counter, Histogram, register } from 'prom-client';

export const notificationSentCounter = new Counter({
  name: 'notifications_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['channel', 'status', 'template'],
});

export const notificationLatencyHistogram = new Histogram({
  name: 'notification_send_duration_seconds',
  help: 'Duration of notification sending',
  labelNames: ['channel', 'template'],
});
```

### 2. Structured Logging
```typescript
// apps/notification-service/src/utils/logger.util.ts
import { Logger } from '@nestjs/common';

export class NotificationLogger extends Logger {
  logNotificationSent(templateKey: string, channel: string, recipient: string) {
    this.log('Notification sent', {
      event: 'notification_sent',
      templateKey,
      channel,
      recipient,
      timestamp: new Date().toISOString(),
    });
  }

  logNotificationFailed(templateKey: string, channel: string, error: string) {
    this.error('Notification failed', {
      event: 'notification_failed',
      templateKey,
      channel,
      error,
      timestamp: new Date().toISOString(),
    });
  }
}
