import { Injectable, ExecutionContext } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  /**
   * Determine if request should be cached
   */
  protected isRequestCacheable(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return false;
    }

    // Skip caching for user-specific endpoints
    const skipPaths = [
      '/api/v1/orders',      // Orders vary by user
      '/api/v1/customers/me', // Current user endpoint
    ];

    if (skipPaths.some((path) => request.url.startsWith(path))) {
      return false;
    }

    return true;
  }

  /**
   * Generate cache key from request
   */
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();

    // Include query params in cache key
    const queryString = new URLSearchParams(request.query).toString();
    const baseKey = request.url.split('?')[0];

    return queryString ? `${baseKey}?${queryString}` : baseKey;
  }
}
