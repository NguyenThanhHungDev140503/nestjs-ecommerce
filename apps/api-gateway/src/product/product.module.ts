import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProductController } from './product.controller';
import { ProductGatewayService } from './product.service';
import { INVENTORY_SERVICE } from 'libs/common/constants/services';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: INVENTORY_SERVICE,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672'],
            queue: configService.get<string>('RABBITMQ_INVENTORY_INFO_QUEUE') || 'inventory-info-queue',
            queueOptions: {
              durable: true,
            },
            maxConnectionAttempts: 5,
            socketOptions: {
              reconnectTimeInSeconds: 5,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductGatewayService],
})
export class ProductModule {}

