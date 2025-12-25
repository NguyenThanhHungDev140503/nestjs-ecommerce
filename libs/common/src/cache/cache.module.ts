import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import Keyv from 'keyv';
import { CacheService } from './cache.service';
import { CacheInvalidationService } from './cache-invalidation.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST', 'localhost');
        const redisPort = configService.get('REDIS_PORT', 6379);
        const redisPassword = configService.get('REDIS_PASSWORD', '');
        const redisDb = configService.get('REDIS_DB', 0);
        const cacheTtl = configService.get('CACHE_TTL', 60000);

        return {
          stores: [
            // L1: In-memory cache (fastest, per-instance)
            new Keyv({
              namespace: 'ecommerce-l1',
              ttl: cacheTtl,
            }),
            // L2: Redis cache (distributed, shared)
            await redisStore({
              socket: {
                host: redisHost,
                port: redisPort,
              },
              password: redisPassword || undefined,
              database: redisDb,
            }),
          ],
          ttl: cacheTtl,
          isGlobal: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService, CacheInvalidationService],
  exports: [CacheModule, CacheService, CacheInvalidationService],
})
export class RedisCacheModule {}
