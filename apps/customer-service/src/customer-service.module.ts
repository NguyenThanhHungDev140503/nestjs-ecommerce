import { Module } from '@nestjs/common';
import { CustomerServiceController } from './customer-service.controller';
import { CustomerServiceService } from './customer-service.service';
import { PrismaModule } from 'libs/common/database/prisma.module';
import { RedisCacheModule } from 'libs/common/src/cache';

@Module({
  imports: [PrismaModule, RedisCacheModule],
  controllers: [CustomerServiceController],
  providers: [CustomerServiceService],
})
export class CustomerServiceModule {}
