import { Module } from '@nestjs/common';
import { InventoryServiceController } from './inventory-service.controller';
import { InventoryService } from './inventory-service.service';
import { PrismaModule } from 'libs/common/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryServiceController],
  providers: [InventoryService],
})
export class InventoryServiceModule {}
