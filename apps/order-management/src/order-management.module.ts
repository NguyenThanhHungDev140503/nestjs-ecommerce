import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrderManagementService } from './order-management.service';
import { OrderManagementController } from './order-management.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CUSTOMER_SERVICE, INVENTORY_SERVICE } from 'libs/common/constants/services';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderLineItem } from './entities/order-line-item.entity';
import { Product } from './entities/product.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    ClientsModule.registerAsync([
      {
        name: CUSTOMER_SERVICE,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: configService.get<string>('RABBITMQ_CUSTOMER_INFO_QUEUE'),
            maxConnectionAttempts: 5,
            socketOptions: {
              reconnectTimeInSeconds: 5,
            },
          },
        }),
        inject: [ConfigService],
      },
      {
        name: INVENTORY_SERVICE,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: configService.get<string>('RABBITMQ_INVENTORY_INFO_QUEUE'),
            maxConnectionAttempts: 5,
            socketOptions: {
              reconnectTimeInSeconds: 5,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        let databaseUrl = configService.get<string>('DATABASE_URL');

        // Clean up DATABASE_URL: remove quotes if present
        if (databaseUrl) {
          databaseUrl = databaseUrl.trim().replace(/^['"]|['"]$/g, '');
        }

        // Config for Neon/Cloud DB using Connection String
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [Order, OrderLineItem, Product],
            synchronize: true, //*DO NOT USE IN PRODUCTION
            ssl: true, // Neon requires SSL
            extra: {
              ssl: {
                rejectUnauthorized: false, // For some environments
              },
            },
          };
        }

        // Fallback to local config
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USER', 'maharshi'),
          password: configService.get<string>('DB_PASSWORD', 'password123'),
          database: configService.get<string>('DB_NAME', 'ecommerce'),
          entities: [Order, OrderLineItem, Product],
          synchronize: true, //*DO NOT USE IN PRODUCTION
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Order, OrderLineItem, Product]),
  ],
  controllers: [OrderManagementController],
  providers: [OrderManagementService],
})
export class OrderManagementModule {}
