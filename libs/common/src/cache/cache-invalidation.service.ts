import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { CACHE_KEYS } from './cache.constants';

export type InvalidationEvent =
  | { type: 'PRODUCT_CREATED' }
  | { type: 'PRODUCT_UPDATED'; productId: string }
  | { type: 'PRODUCT_DELETED'; productId: string }
  | { type: 'CUSTOMER_UPDATED'; customerId: string }
  | { type: 'CUSTOMER_DELETED'; customerId: string }
  | { type: 'ORDER_CREATED'; customerId: string; productIds: string[] }
  | { type: 'ORDER_UPDATED'; orderId: string; customerId: string }
  | { type: 'ORDER_CANCELLED'; orderId: string; customerId: string; productIds: string[] }
  | { type: 'STOCK_CHANGED'; productId: string };

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Handle cache invalidation based on event type
   */
  async invalidate(event: InvalidationEvent): Promise<void> {
    this.logger.log(`Cache invalidation triggered: ${event.type}`);

    try {
      switch (event.type) {
        case 'PRODUCT_CREATED':
          await this.invalidateProductLists();
          break;

        case 'PRODUCT_UPDATED':
        case 'PRODUCT_DELETED':
          await this.invalidateProduct(event.productId);
          break;

        case 'CUSTOMER_UPDATED':
          await this.invalidateCustomer(event.customerId);
          break;

        case 'CUSTOMER_DELETED':
          await this.invalidateCustomer(event.customerId);
          await this.cacheManager.del(CACHE_KEYS.ORDERS.LIST(event.customerId));
          break;

        case 'ORDER_CREATED':
          await this.invalidateOrderCreation(event.customerId, event.productIds);
          break;

        case 'ORDER_UPDATED':
          await this.invalidateOrder(event.orderId, event.customerId);
          break;

        case 'ORDER_CANCELLED':
          await this.invalidateOrderCancellation(
            event.orderId,
            event.customerId,
            event.productIds,
          );
          break;

        case 'STOCK_CHANGED':
          await this.invalidateInventory(event.productId);
          break;
      }

      this.logger.log(`Cache invalidation completed: ${event.type}`);
    } catch (error) {
      this.logger.error(`Cache invalidation failed: ${event.type}`, error.message);
    }
  }

  private async invalidateProduct(productId: string): Promise<void> {
    await Promise.all([
      this.cacheManager.del(CACHE_KEYS.PRODUCTS.DETAIL(productId)),
      this.cacheManager.del(CACHE_KEYS.INVENTORY.DETAIL(productId)),
      this.invalidateProductLists(),
    ]);
  }

  private async invalidateProductLists(): Promise<void> {
    // For pattern-based deletion, need Redis SCAN
    // Simplified: invalidate common pagination patterns
    const commonPages = [1, 2, 3, 4, 5];
    const commonLimits = [10, 20, 50];

    const keys = commonPages.flatMap((page) =>
      commonLimits.map((limit) => CACHE_KEYS.PRODUCTS.LIST(page, limit)),
    );

    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  }

  private async invalidateCustomer(customerId: string): Promise<void> {
    await this.cacheManager.del(CACHE_KEYS.CUSTOMERS.DETAIL(customerId));
  }

  private async invalidateInventory(productId: string): Promise<void> {
    await Promise.all([
      this.cacheManager.del(CACHE_KEYS.INVENTORY.DETAIL(productId)),
      this.cacheManager.del(CACHE_KEYS.INVENTORY.STOCK(productId)),
    ]);
  }

  private async invalidateOrder(orderId: string, customerId: string): Promise<void> {
    await Promise.all([
      this.cacheManager.del(CACHE_KEYS.ORDERS.DETAIL(orderId)),
      this.cacheManager.del(CACHE_KEYS.ORDERS.LIST(customerId)),
    ]);
  }

  private async invalidateOrderCreation(
    customerId: string,
    productIds: string[],
  ): Promise<void> {
    await this.cacheManager.del(CACHE_KEYS.ORDERS.LIST(customerId));
    await Promise.all(
      productIds.map((productId) => this.invalidateInventory(productId)),
    );
  }

  private async invalidateOrderCancellation(
    orderId: string,
    customerId: string,
    productIds: string[],
  ): Promise<void> {
    await this.invalidateOrder(orderId, customerId);
    await Promise.all(
      productIds.map((productId) => this.invalidateInventory(productId)),
    );
  }
}
