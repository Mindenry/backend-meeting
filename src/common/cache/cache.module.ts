import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { CacheHelperService } from './cache-helper.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        
        if (redisUrl) {
          // Use Redis if available
          // Note: For Redis, you need to install cache-manager-redis-store or use cache-manager-redis-yet
          // For now, we'll use in-memory cache and you can configure Redis later
          try {
            const redisStore = require('cache-manager-redis-store');
            return {
              store: redisStore,
              url: redisUrl,
              ttl: 3600, // Default TTL: 1 hour
            };
          } catch (e) {
            // Fallback to in-memory if Redis store not available
            return {
              ttl: 3600,
              max: 1000, // Increased max items
            };
          }
        } else {
          // Fallback to in-memory cache
          return {
            ttl: 3600, // Default TTL: 1 hour
            max: 1000, // Maximum number of items in cache (increased)
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService, CacheHelperService],
  exports: [CacheService, CacheHelperService],
})
export class CacheModule {}
