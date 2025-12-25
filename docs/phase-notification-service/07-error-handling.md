# Error Handling và Retry Mechanisms

## Tổng quan
Tài liệu này mô tả chiến lược xử lý lỗi và cơ chế retry cho Notification Service, đảm bảo độ tin cậy và performance của hệ thống.

## Error Types

### 1. Client Errors (4xx)
- **400 Bad Request**: Invalid input, validation errors
- **401 Unauthorized**: Authentication failed
- **403 Forbidden**: Permission denied
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict
- **422 Unprocessable Entity**: Validation failed
- **429 Too Many Requests**: Rate limit exceeded

### 2. Server Errors (5xx)
- **500 Internal Server Error**: Unexpected server error
- **502 Bad Gateway**: Novu API unavailable
- **503 Service Unavailable**: Service temporarily unavailable
- **504 Gateway Timeout**: Novu API timeout

### 3. Business Logic Errors
- **Template Not Found**: Notification template doesn't exist
- **Invalid Recipient**: Recipient email/phone invalid
- **User Opted Out**: User has disabled notifications
- **Provider Error**: Third-party provider error

## Error Handling Strategy

### 1. Global Exception Filter
```typescript
// apps/notification-service/src/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { NotificationException } from '../exceptions/notification.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        message = (exceptionResponse as any).message || exception.message;
        details = (exceptionResponse as any).details || {};
      }
      
      error = exception.constructor.name;
    } else if (exception instanceof NotificationException) {
      status = exception.statusCode;
      message = exception.message;
      error = exception.code;
      details = exception.details || {};
    } else if (exception instanceof Error) {
      message = exception.message;
      error = 'Internal Server Error';
    }

    // Log error details
    this.logError(exception, request);

    const errorResponse = {
      statusCode: status,
      message,
      error,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.id,
    };

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && status >= 500) {
      errorResponse.message = 'Something went wrong';
      delete errorResponse.details;
    }

    response.status(status).json(errorResponse);
  }

  private logError(exception: unknown, request: Request) {
    const error = exception instanceof Error ? exception : new Error(String(exception));
    
    this.logger.error(
      `HTTP Exception: ${error.message}`,
      {
        stack: error.stack,
        url: request.url,
        method: request.method,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        requestId: request.id,
      },
    );
  }
}
```

### 2. Custom Exceptions
```typescript
// apps/notification-service/src/exceptions/notification.exception.ts
export class NotificationException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'NotificationException';
  }
}

export class NovuException extends NotificationException {
  constructor(message: string, originalError?: any, details?: any) {
    super(message, 'NOVU_ERROR', 502, details);
    this.originalError = originalError;
  }
}

export class TemplateNotFoundException extends NotificationException {
  constructor(templateKey: string) {
    super(`Template not found: ${templateKey}`, 'TEMPLATE_NOT_FOUND', 404, {
      templateKey,
    });
  }
}

export class InvalidRecipientException extends NotificationException {
  constructor(recipient: string, type: string) {
    super(`Invalid ${type}: ${recipient}`, 'INVALID_RECIPIENT', 400, {
      recipient,
      type,
    });
  }
}

export class UserOptedOutException extends NotificationException {
  constructor(userId: string) {
    super(`User ${userId} has opted out of notifications`, 'USER_OPTED_OUT', 403, {
      userId,
    });
  }
}

export class ProviderException extends NotificationException {
  constructor(provider: string, error: string) {
    super(`Provider ${provider} error: ${error}`, 'PROVIDER_ERROR', 502, {
      provider,
      error,
    });
  }
}

export class RateLimitException extends NotificationException {
  constructor(limit: number, window: number) {
    super(
      `Rate limit exceeded. Limit: ${limit} per ${window} seconds`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { limit, window }
    );
  }
}
```

## Retry Mechanisms

### 1. Exponential Backoff
```typescript
// libs/common/src/utils/retry.util.ts
import { Logger } from '@nestjs/common';
import { setTimeout } from 'timers/promises';

const logger = new Logger('RetryUtil');

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  factor?: number;
  jitter?: boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    jitter = true,
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(baseDelay * Math.pow(factor, attempt - 1), maxDelay);
      
      // Add jitter to prevent thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }
      
      logger.warn(
        `Attempt ${attempt} failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`,
        error.stack,
      );
      
      await setTimeout(delay);
    }
  }
  
  throw new Error(`All ${maxRetries} attempts failed: ${lastError.message}`);
}
```

### 2. Circuit Breaker Pattern
```typescript
// libs/common/src/utils/circuit-breaker.util.ts
import { Logger } from '@nestjs/common';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
  expectedRecoveryTime?: number;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailure: Date | null = null;
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private readonly options: Required<CircuitBreakerOptions>;
  private readonly logger = new Logger('CircuitBreaker');

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 3,
      resetTimeout: options.resetTimeout || 30000,
      monitoringPeriod: options.monitoringPeriod || 10000,
      expectedRecoveryTime: options.expectedRecoveryTime || 60000,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.logger.log('Circuit breaker moved to HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      
      if (this.state === CircuitBreakerState.HALF_OPEN) {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failures++;
    this.lastFailure = new Date();
    
    if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.logger.error(`Circuit breaker tripped to OPEN state`);
      
      // Schedule reset
      setTimeout(() => {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.logger.log('Circuit breaker moved to HALF_OPEN state');
      }, this.options.resetTimeout);
    }
  }

  private reset() {
    this.failures = 0;
    this.lastFailure = null;
    this.state = CircuitBreakerState.CLOSED;
    this.logger.log('Circuit breaker reset to CLOSED state');
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailure !== null && 
           Date.now() - this.lastFailure.getTime() > this.options.resetTimeout;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
    };
  }
}
```

### 3. Retry with Circuit Breaker
```typescript
// apps/notification-service/src/services/resilient-notification.service.ts
import { Injectable } from '@nestjs/common';
import { NovuService } from '@app/common/novu/novu.service';
import { withRetry } from '@app/common/utils/retry.util';
import { CircuitBreaker } from '@app/common/utils/circuit-breaker.util';

@Injectable()
export class ResilientNotificationService {
  private readonly circuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 30000,
  });

  constructor(private readonly novuService: NovuService) {}

  async sendNotificationWithRetry(
    workflowId: string,
    subscriberId: string,
    payload: Record<string, any>,
  ) {
    return this.circuitBreaker.execute(() =>
      withRetry(() =>
        this.novuService.triggerWorkflow(workflowId, subscriberId, payload),
        {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000,
        }
      )
    );
  }
}
```

## Error Recovery Strategies

### 1. Dead Letter Queue
```typescript
// apps/notification-service/src/services/dead-letter.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/common/prisma/prisma.service';

@Injectable()
export class DeadLetterService {
  constructor(private readonly prisma: PrismaService) {}

  async addToDeadLetter(notificationData: any, error: Error) {
    return this.prisma.notificationDeadLetter.create({
      data: {
        notificationData,
        error: error.message,
        stack: error.stack,
        createdAt: new Date(),
        retryCount: 0,
      },
    });
  }

  async retryFailedNotifications() {
    const failedNotifications = await this.prisma.notificationDeadLetter.findMany({
      where: {
        retryCount: { lt: 3 },
        nextRetryAt: { lte: new Date() },
      },
    });

    for (const notification of failedNotifications) {
      try {
        // Retry the notification
        await this.retryNotification(notification);
        
        // Remove from dead letter queue on success
        await this.prisma.notificationDeadLetter.delete({
          where: { id: notification.id },
        });
      } catch (error) {
        // Update retry count and schedule next retry
        await this.prisma.notificationDeadLetter.update({
          where: { id: notification.id },
          data: {
            retryCount: notification.retryCount + 1,
            nextRetryAt: this.calculateNextRetry(notification.retryCount + 1),
            lastError: error.message,
          },
        });
      }
    }
  }

  private calculateNextRetry(retryCount: number): Date {
    const delays = [1, 5, 15, 30, 60]; // minutes
    const delay = delays[Math.min(retryCount - 1, delays.length - 1)];
    return new Date(Date.now() + delay * 60 * 1000);
  }

  private async retryNotification(notification: any) {
    // Implement retry logic
    // This would call the original notification service
  }
}
```

### 2. Graceful Degradation
```typescript
// apps/notification-service/src/services/fallback.service.ts
import { Injectable } from '@nestjs/common';
import { NovuService } from '@app/common/novu/novu.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Injectable()
export class FallbackService {
  constructor(
    private readonly novuService: NovuService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  async sendWithFallback(
    workflowId: string,
    subscriberId: string,
    payload: Record<string, any>,
  ) {
    try {
      // Try Novu first
      return await this.novuService.triggerWorkflow(workflowId, subscriberId, payload);
    } catch (novuError) {
      console.warn('Novu failed, trying fallback providers', novuError);
      
      try {
        // Try direct email
        if (payload.user?.email) {
          await this.emailService.sendDirectEmail(
            payload.user.email,
            this.generateFallbackEmail(workflowId, payload),
          );
        }
        
        // Try direct SMS
        if (payload.user?.phone) {
          await this.smsService.sendDirectSms(
            payload.user.phone,
            this.generateFallbackSms(workflowId, payload),
          );
        }
        
        return { success: true, fallback: true };
      } catch (fallbackError) {
        throw new Error(`All providers failed: Novu: ${novuError.message}, Fallback: ${fallbackError.message}`);
      }
    }
  }

  private generateFallbackEmail(workflowId: string, payload: any) {
    // Generate fallback email content based on workflow
    return {
      subject: `Notification: ${workflowId}`,
      body: JSON.stringify(payload, null, 2),
    };
  }

  private generateFallbackSms(workflowId: string, payload: any) {
    // Generate fallback SMS content based on workflow
    return `Notification: ${workflowId}`;
  }
}
```

## Monitoring and Alerting

### 1. Error Metrics
```typescript
// apps/notification-service/src/metrics/error.metrics.ts
import { Counter, Histogram, Gauge, register } from 'prom-client';

export const errorCounter = new Counter({
  name: 'notification_errors_total',
  help: 'Total number of notification errors',
  labelNames: ['error_type', 'provider', 'template'],
});

export const retryCounter = new Counter({
  name: 'notification_retries_total',
  help: 'Total number of notification retries',
  labelNames: ['template', 'attempt'],
});

export const circuitBreakerGauge = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN)',
  labelNames: ['provider'],
});

export const deadLetterQueueSize = new Gauge({
  name: 'dead_letter_queue_size',
  help: 'Number of items in dead letter queue',
});
```

### 2. Alerting Rules
```yaml
# prometheus/alerts.yml
groups:
  - name: notification_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(notification_errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High notification error rate"
          description: "Error rate is {{ $value }} errors per second"

      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker is open"
          description: "Circuit breaker for {{ $labels.provider }} is open"

      - alert: DeadLetterQueueFull
        expr: dead_letter_queue_size > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Dead letter queue is full"
          description: "Dead letter queue has {{ $value }} items"
```

## Testing Error Scenarios

### 1. Unit Tests
```typescript
// apps/notification-service/test/error-handling.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ResilientNotificationService } from '../src/services/resilient-notification.service';
import { NovuService } from '@app/common/novu/novu.service';

describe('Error Handling', () => {
  let service: ResilientNotificationService;
  let novuService: jest.Mocked<NovuService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResilientNotificationService,
        {
          provide: NovuService,
          useValue: {
            triggerWorkflow: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResilientNotificationService>(ResilientNotificationService);
    novuService = module.get(NovuService);
  });

  it('should retry on failure', async () => {
    novuService.triggerWorkflow
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ success: true });

    await expect(
      service.sendNotificationWithRetry('test-workflow', 'user-123', {})
    ).resolves.toEqual({ success: true });

    expect(novuService.triggerWorkflow).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries', async () => {
    novuService.triggerWorkflow.mockRejectedValue(new Error('Network error'));

    await expect(
      service.sendNotificationWithRetry('test-workflow', 'user-123', {})
    ).rejects.toThrow('All 3 attempts failed');
  });
});
```

### 2. Integration Tests
```typescript
// apps/notification-service/test/error-handling.integration.spec.ts
describe('Error Handling Integration', () => {
  it('should handle Novu API timeout', async () => {
    // Mock Novu API timeout
    // Test circuit breaker behavior
  });

  it('should handle database connection failure', async () => {
    // Mock database failure
    // Test fallback behavior
  });

  it('should handle rate limiting', async () => {
    // Simulate rate limiting
    // Test rate limit handling
  });
});
```

## Best Practices

### 1. Error Prevention
- Validate inputs early
- Use proper TypeScript types
- Implement comprehensive logging
- Monitor system health

### 2. Error Recovery
- Implement automatic retries
- Use circuit breakers
- Provide fallback mechanisms
- Maintain dead letter queues

### 3. Error Communication
- Provide meaningful error messages
- Include error context
- Use appropriate HTTP status codes
- Document error scenarios

### 4. Performance Considerations
- Avoid excessive retries
- Use exponential backoff
- Implement circuit breakers
- Monitor retry patterns
