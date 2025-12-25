import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomerController } from './customer.controller';
import { CustomerGatewayService } from './customer.service';
import { CUSTOMER_SERVICE } from 'libs/common/constants/services';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: CUSTOMER_SERVICE,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672'],
            queue: configService.get<string>('RABBITMQ_CUSTOMER_INFO_QUEUE') || 'customer-info-queue',
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
  controllers: [CustomerController],
  providers: [CustomerGatewayService],
})
export class CustomerModule {}

