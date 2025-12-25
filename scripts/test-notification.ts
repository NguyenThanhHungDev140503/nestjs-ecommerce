import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const envPath = resolve(__dirname, '../.env.development');
console.log('🔍 Checking env file at:', envPath);

if (existsSync(envPath)) {
  console.log('✅ Found .env.development file');
  config({ path: envPath });
} else {
  console.error('❌ .env.development file NOT found at:', envPath);
  process.exit(1);
}

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotificationService } from '../apps/notification-service/src/notification.service';
import { UserPreferenceService } from '../apps/notification-service/src/user-preference.service';
import { PrismaService } from '../libs/common/database/prisma.service';
import { NovuModule } from '../apps/notification-service/src/novu/novu.module';
import notificationConfig from '../apps/notification-service/src/config/notification.config';

// Mock dependencies
const mockCacheManager = {
  get: () => null,
  set: () => null,
  del: () => null,
  store: {
    keys: () => [],
  }
};

async function bootstrap() {
  console.log('🚀 Starting Notification Service Test...');
  console.log('DEBUG: Checking Environment Variables...');
  console.log('PAD_DATABASE_URL:', process.env.DATABASE_URL ? (process.env.DATABASE_URL.substring(0, 20) + '...') : 'UNDEFINED');
  
  let moduleRef: TestingModule | undefined;

  try {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true, // Use loaded env vars from dotenv above
          load: [notificationConfig],
        }),
        NovuModule,
      ],
      providers: [
        NotificationService,
        UserPreferenceService,
        PrismaService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    await moduleRef.init(); // Trigger onModuleInit hooks to initialize NovuService


    const prismaService = moduleRef.get<PrismaService>(PrismaService);
    const notificationService = moduleRef.get<NotificationService>(NotificationService);
    
    // 1. Create dummy Customer
    const testEmail = `test.user.${Date.now()}@example.com`;
    console.log(`👤 Creating test customer: ${testEmail}...`);
    const customer = await prismaService.customer.create({
      data: {
        name: 'Test User',
        email: testEmail,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });

    // 2. Create dummy Order
    console.log(`📦 Creating test order for customer ${customer.id}...`);
    const order = await prismaService.order.create({
      data: {
        customer_id: customer.id,
        shipping_address: '123 Test St, Test City, TS',
        total_amount: 100.00,
        status: 'PROCESSING',
      },
    });
    
    const testOrderId = order.id;
    console.log(`📨 Sending order confirmation for Order ID: ${testOrderId}...`);
    
    // 3. Trigger Notification
    const result = await notificationService.sendOrderConfirmation(testOrderId);
    
    console.log('✅ Notification sent successfully!');
    console.log('📦 Result:', JSON.stringify(result, null, 2));

    // 4. Cleanup
    console.log('🧹 Cleaning up test data...');
    await prismaService.order.delete({ where: { id: order.id } });
    await prismaService.customer.delete({ where: { id: customer.id } });
    console.log('✅ Cleanup complete.');

  } catch (error) {
    console.error('❌ Failed to test notification:', error);
  } finally {
    if (moduleRef) {
        const prismaService = moduleRef.get<PrismaService>(PrismaService);
        if(prismaService) await prismaService.$disconnect();
    }
    console.log('🏁 Test finished.');
    process.exit(0);
  }
}

bootstrap();
