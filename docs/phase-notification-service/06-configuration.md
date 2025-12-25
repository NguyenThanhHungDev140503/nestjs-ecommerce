# Configuration

## Tổng quan
Tài liệu này mô tả chi tiết cách cấu hình Notification Service với Novu, bao gồm environment variables, provider setup và các tùy chọn cấu hình khác.

## Environment Variables

### 1. Novu Configuration
```env
# Novu API Configuration
NOVU_API_KEY=your_novu_api_key_here
NOVU_APP_ID=your_novu_app_id_here
NOVU_API_URL=https://api.novu.co
```

### 2. Database Configuration
```env
# PostgreSQL Database
DATABASE_URL=postgresql://username:password@localhost:5432/notification_db
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=notification_user
DATABASE_PASSWORD=secure_password
DATABASE_NAME=notification_db
DATABASE_SSL=false
DATABASE_POOL_SIZE=10
```

### 3. Redis Configuration
```env
# Redis Cache
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_CONNECT_TIMEOUT=5000
REDIS_COMMAND_TIMEOUT=2000
```

### 4. RabbitMQ Configuration
```env
# RabbitMQ Message Queue
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/
RABBITMQ_EXCHANGE=notifications
RABBITMQ_QUEUE=notification_queue
```

### 5. Email Provider Configuration
```env
# SendGrid
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_SENDER_EMAIL=noreply@yourdomain.com
SENDGRID_SENDER_NAME=Your Company

# SMTP Alternative
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 6. SMS Provider Configuration
```env
# Twilio
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 7. Push Notification Configuration
```env
# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
```

### 8. Application Configuration
```env
# Application Settings
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
APP_NAME=Notification Service
APP_VERSION=1.0.0

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_PATH=./logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5
```

### 9. Security Configuration
```env
# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# CORS
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true
```

### 10. Monitoring Configuration
```env
# Prometheus Metrics
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9464
PROMETHEUS_PATH=/metrics

# Health Checks
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH=/health
```

## Configuration Files

### 1. app.module.ts
```typescript
// apps/notification-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '@app/common/prisma/prisma.module';
import { NovuModule } from '@app/common/novu/novu.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validation: {
        // Validation schema
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL) || 60,
        limit: parseInt(process.env.RATE_LIMIT_LIMIT) || 100,
      },
    ]),
    PrismaModule,
    NovuModule,
  ],
})
export class AppModule {}
```

### 2. config/configuration.ts
```typescript
// apps/notification-service/src/config/configuration.ts
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  name: process.env.APP_NAME || 'Notification Service',
  version: process.env.APP_VERSION || '1.0.0',
  env: process.env.NODE_ENV || 'development',
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  name: process.env.DATABASE_NAME,
  ssl: process.env.DATABASE_SSL === 'true',
  poolSize: parseInt(process.env.DATABASE_POOL_SIZE) || 10,
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL,
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB) || 0,
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT) || 5000,
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT) || 2000,
}));

export const novuConfig = registerAs('novu', () => ({
  apiKey: process.env.NOVU_API_KEY,
  appId: process.env.NOVU_APP_ID,
  apiUrl: process.env.NOVU_API_URL || 'https://api.novu.co',
}));

export const emailConfig = registerAs('email', () => ({
  provider: process.env.EMAIL_PROVIDER || 'sendgrid',
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    senderEmail: process.env.SENDGRID_SENDER_EMAIL,
    senderName: process.env.SENDGRID_SENDER_NAME,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    username: process.env.SMTP_USERNAME,
    password: process.env.SMTP_PASSWORD,
  },
}));

export const smsConfig = registerAs('sms', () => ({
  provider: process.env.SMS_PROVIDER || 'twilio',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
}));

export const pushConfig = registerAs('push', () => ({
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
    authUri: process.env.FIREBASE_AUTH_URI,
    tokenUri: process.env.FIREBASE_TOKEN_URI,
  },
}));
```

### 3. config/validation.ts
```typescript
// apps/notification-service/src/config/validation.ts
import { plainToClass } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  NOVU_API_KEY: string;

  @IsString()
  NOVU_APP_ID: string;

  @IsOptional()
  @IsString()
  NOVU_API_URL?: string;

  @IsString()
  DATABASE_URL: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsOptional()
  @IsNumber()
  PORT?: number;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsString()
  EMAIL_PROVIDER?: string;

  @IsOptional()
  @IsString()
  SMS_PROVIDER?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  return validatedConfig;
}
```

## Provider Specific Configuration

### 1. SendGrid Setup
```typescript
// libs/common/src/providers/sendgrid.provider.ts
import { Injectable } from '@nestjs/common';
import { MailService } from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SendGridProvider {
  private mailService: MailService;

  constructor(private configService: ConfigService) {
    this.mailService = new MailService();
    this.mailService.setApiKey(this.configService.get('email.sendgrid.apiKey'));
  }

  async sendEmail(to: string, subject: string, content: string) {
    const msg = {
      to,
      from: {
        email: this.configService.get('email.sendgrid.senderEmail'),
        name: this.configService.get('email.sendgrid.senderName'),
      },
      subject,
      text: content,
      html: content,
    };

    return this.mailService.send(msg);
  }
}
```

### 2. Twilio Setup
```typescript
// libs/common/src/providers/twilio.provider.ts
import { Injectable } from '@nestjs/common';
import { Twilio } from 'twilio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwilioProvider {
  private client: Twilio;

  constructor(private configService: ConfigService) {
    this.client = new Twilio(
      this.configService.get('sms.twilio.accountSid'),
      this.configService.get('sms.twilio.authToken'),
    );
  }

  async sendSMS(to: string, message: string) {
    return this.client.messages.create({
      body: message,
      from: this.configService.get('sms.twilio.phoneNumber'),
      to,
    });
  }
}
```

### 3. Firebase Setup
```typescript
// libs/common/src/providers/firebase.provider.ts
import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseProvider {
  private app: admin.app.App;

  constructor(private configService: ConfigService) {
    const serviceAccount = {
      projectId: this.configService.get('push.firebase.projectId'),
      privateKeyId: this.configService.get('push.firebase.privateKeyId'),
      privateKey: this.configService.get('push.firebase.privateKey'),
      clientEmail: this.configService.get('push.firebase.clientEmail'),
      clientId: this.configService.get('push.firebase.clientId'),
      authUri: this.configService.get('push.firebase.authUri'),
      tokenUri: this.configService.get('push.firebase.tokenUri'),
    };

    this.app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  async sendPushNotification(token: string, payload: admin.messaging.Message) {
    return this.app.messaging().send(payload);
  }
}
```

## Docker Configuration

### 1. Dockerfile
```dockerfile
# apps/notification-service/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### 2. docker-compose.yml
```yaml
# docker-compose.notification.yml
version: '3.8'

services:
  notification-service:
    build:
      context: .
      dockerfile: apps/notification-service/Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/notification_db
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - NOVU_API_KEY=${NOVU_API_KEY}
    ports:
      - "3004:3000"
    depends_on:
      - postgres
      - redis
      - rabbitmq
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=notification_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      - RABBITMQ_DEFAULT_USER=guest
      - RABBITMQ_DEFAULT_PASS=guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
```

## Kubernetes Configuration

### 1. ConfigMap
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: notification-config
data:
  NODE_ENV: "production"
  PORT: "3000"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  DATABASE_HOST: "postgres-service"
  DATABASE_PORT: "5432"
  RABBITMQ_HOST: "rabbitmq-service"
  RABBITMQ_PORT: "5672"
```

### 2. Secret
```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: notification-secrets
type: Opaque
data:
  DATABASE_PASSWORD: <base64-encoded-password>
  REDIS_PASSWORD: <base64-encoded-password>
  NOVU_API_KEY: <base64-encoded-api-key>
  JWT_SECRET: <base64-encoded-jwt-secret>
```

## Configuration Best Practices

### 1. Environment Management
- Sử dụng `.env.local` cho development
- Sử dụng `.env.production` cho production
- Không commit `.env.local` vào version control
- Sử dụng environment variables cho sensitive data

### 2. Validation
- Validate tất cả environment variables
- Sử dụng TypeScript interfaces cho type safety
- Provide default values cho optional configurations

### 3. Security
- Mã hóa sensitive data trong storage
- Sử dụng secret management tools (AWS Secrets Manager, HashiCorp Vault)
- Rotate keys và passwords định kỳ

### 4. Monitoring
- Log configuration changes
- Monitor configuration validation errors
- Alert cho critical configuration issues

## Troubleshooting

### 1. Common Issues
- Invalid Novu API key
- Database connection failed
- Redis connection timeout
- RabbitMQ connection issues

### 2. Debug Commands
```bash
# Check environment variables
printenv | grep NOVU

# Test database connection
npx prisma db pull

# Test Redis connection
redis-cli ping

# Test RabbitMQ connection
rabbitmqctl status
```
