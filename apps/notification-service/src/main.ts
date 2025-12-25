import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NotificationModule } from './notification.module';
import { configDotenv } from 'dotenv';
import { Logger } from '@nestjs/common';

configDotenv();

async function bootstrap() {
  const logger = new Logger('NotificationService');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
        queue: process.env.RABBITMQ_NOTIFICATION_QUEUE || 'notification-queue',
        queueOptions: {
          durable: true,
        },
        maxConnectionAttempts: 5,
        socketOptions: {
          reconnectTimeInSeconds: 5,
        },
      },
    },
  );

  await app.listen();
  logger.log('Notification Service is listening...');
}

bootstrap();
