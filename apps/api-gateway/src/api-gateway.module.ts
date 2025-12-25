import { Module } from '@nestjs/common';
import { OrderManagementModule } from './order-management/order-management.module';
import { CustomerModule } from './customer/customer.module';
import { ProductModule } from './product/product.module';
import { ConfigModule } from '@nestjs/config';
import { RedisCacheModule } from 'libs/common/src/cache';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    RedisCacheModule,
    OrderManagementModule,
    CustomerModule,
    ProductModule,
  ],
  controllers: [],
  providers: [],
})
export class ApiGatewayModule {}
