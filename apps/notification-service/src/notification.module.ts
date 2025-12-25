import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { UserPreferenceService } from './user-preference.service';
import { PrismaModule } from 'libs/common/database/prisma.module';
import { RedisCacheModule } from 'libs/common/src/cache';
import { NovuModule } from './novu/novu.module';
import notificationConfig from './config/notification.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
      load: [notificationConfig],
    }),
    PrismaModule,
    RedisCacheModule,
    NovuModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService, UserPreferenceService],
  exports: [NotificationService, UserPreferenceService],
})
export class NotificationModule {}
