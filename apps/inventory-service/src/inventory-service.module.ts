import { Module } from '@nestjs/common';
import { InventoryServiceController } from './inventory-service.controller';
import { InventoryService } from './inventory-service.service';
import { PrismaModule } from 'libs/common/database/prisma.module';
import { RedisCacheModule } from 'libs/common/src/cache';

@Module({
  imports: [PrismaModule, RedisCacheModule],
  controllers: [InventoryServiceController],
  providers: [InventoryService],
})
export class InventoryServiceModule {}
