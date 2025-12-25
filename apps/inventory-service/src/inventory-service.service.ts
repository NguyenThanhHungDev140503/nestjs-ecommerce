import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'libs/common/database/prisma.service';
import { CreateProductDto } from 'libs/common/dto/product/create-product.dto';
import { UpdateProductDto } from 'libs/common/dto/product/update-product.dto';
import {
  ReserveStockDto,
  ReleaseStockDto,
  CheckAvailabilityDto,
} from 'libs/common/dto/product/stock.dto';
import {
  InventoryItem,
  ProductDetails,
  StockReservationResult,
  StockReleaseResult,
  StockAvailabilityResult,
} from 'libs/common/interfaces/inventory.interface';
import { Prisma } from '@prisma/client';
import { CacheService, CACHE_KEYS, CACHE_TTL } from 'libs/common/src/cache';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  // ============================================
  // PRODUCT CRUD OPERATIONS
  // ============================================

  /**
   * Create a new product
   */
  async createProduct(dto: CreateProductDto): Promise<ProductDetails> {
    this.logger.log(`Creating product: ${dto.name}`);

    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name,
          unit_price: dto.unit_price,
          available_quantity: dto.available_quantity,
          description: dto.description,
          low_stock_threshold: dto.low_stock_threshold || 10,
        },
      });

      this.logger.log(`Product created: ${product.id}`);

      // Check low stock on creation
      await this.checkAndEmitLowStockAlert(product);

      return this.mapToProductDetails(product);
    } catch (error) {
      this.logger.error(`Error creating product: ${error.message}`);
      throw new RpcException({
        statusCode: 500,
        message: 'Không thể tạo sản phẩm',
      });
    }
  }

  /**
   * Get product by ID with caching
   */
  async getProductById(productId: string): Promise<ProductDetails> {
    this.logger.log(`Getting product: ${productId}`);
    const cacheKey = CACHE_KEYS.PRODUCTS.DETAIL(productId);

    // Try to get from cache first
    const cachedProduct = await this.cacheService.get<ProductDetails>(cacheKey);
    if (cachedProduct) {
      this.logger.debug(`Cache HIT for product: ${productId}`);
      return cachedProduct;
    }

    this.logger.debug(`Cache MISS for product: ${productId}`);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new RpcException({
        statusCode: 404,
        message: `Không tìm thấy sản phẩm với ID: ${productId}`,
      });
    }

    const productDetails = this.mapToProductDetails(product);

    // Cache the result
    await this.cacheService.set(cacheKey, productDetails, CACHE_TTL.PRODUCTS.DETAIL);

    return productDetails;
  }

  /**
   * Update product and invalidate cache
   */
  async updateProduct(
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductDetails> {
    this.logger.log(`Updating product: ${productId}`);

    const existingProduct = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      throw new RpcException({
        statusCode: 404,
        message: `Không tìm thấy sản phẩm với ID: ${productId}`,
      });
    }

    try {
      const product = await this.prisma.product.update({
        where: { id: productId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.unit_price !== undefined && { unit_price: dto.unit_price }),
          ...(dto.available_quantity !== undefined && {
            available_quantity: dto.available_quantity,
          }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.low_stock_threshold !== undefined && {
            low_stock_threshold: dto.low_stock_threshold,
          }),
          ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        },
      });

      this.logger.log(`Product updated: ${product.id}`);

      // Check low stock after update
      await this.checkAndEmitLowStockAlert(product);

      // Invalidate related caches
      await this.invalidateProductCaches(productId);

      return this.mapToProductDetails(product);
    } catch (error) {
      this.logger.error(`Error updating product: ${error.message}`);
      throw new RpcException({
        statusCode: 500,
        message: 'Không thể cập nhật sản phẩm',
      });
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(
    productId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Deleting product: ${productId}`);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new RpcException({
        statusCode: 404,
        message: `Không tìm thấy sản phẩm với ID: ${productId}`,
      });
    }

    // Check if product has order line items
    const lineItemCount = await this.prisma.orderLineItem.count({
      where: { product_id: productId },
    });

    if (lineItemCount > 0) {
      // Soft delete - deactivate product
      await this.prisma.product.update({
        where: { id: productId },
        data: { is_active: false },
      });

      return {
        success: true,
        message: `Sản phẩm đã được vô hiệu hóa (có ${lineItemCount} đơn hàng liên quan)`,
      };
    }

    // Hard delete if no orders
    await this.prisma.product.delete({
      where: { id: productId },
    });

    return {
      success: true,
      message: 'Sản phẩm đã được xóa thành công',
    };
  }

  // ============================================
  // INVENTORY DETAILS (backward compatible)
  // ============================================

  /**
   * Get inventory details for multiple products
   */
  async getInventoryDetails(
    items: { productId: string; quantity: number }[],
  ): Promise<InventoryItem[]> {
    this.logger.log(`Getting inventory details for ${items.length} items`);

    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const inventoryResponse = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        return {
          id: item.productId,
          name: `Product ${item.productId} not found`,
          description: 'Product does not exist',
          unit_price: 0,
          available_quantity: 0,
          reserved_quantity: 0,
          requested_quantity: item.quantity,
          total_price: 0,
          is_available: false,
          low_stock_threshold: 0,
          is_low_stock: false,
        };
      }

      const availableQty = product.available_quantity - product.reserved_quantity;
      const isAvailable = availableQty >= item.quantity;

      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        unit_price: Number(product.unit_price),
        available_quantity: product.available_quantity,
        reserved_quantity: product.reserved_quantity,
        requested_quantity: item.quantity,
        total_price: Number(product.unit_price) * item.quantity,
        is_available: isAvailable,
        low_stock_threshold: product.low_stock_threshold,
        is_low_stock: availableQty <= product.low_stock_threshold,
      };
    });

    this.logger.log(`Inventory response prepared`);
    return inventoryResponse;
  }

  // ============================================
  // STOCK RESERVATION
  // ============================================

  /**
   * Reserve stock for an order (with transaction locking)
   */
  async reserveStock(dto: ReserveStockDto): Promise<StockReservationResult[]> {
    this.logger.log(`Reserving stock for order: ${dto.order_id || 'N/A'}`);

    const results: StockReservationResult[] = [];

    // Use interactive transaction with serializable isolation
    try {
      await this.prisma.$transaction(
        async (tx) => {
          for (const item of dto.items) {
            // Lock the product row for update
            const product = await tx.product.findUnique({
              where: { id: item.product_id },
            });

            if (!product) {
              results.push({
                success: false,
                product_id: item.product_id,
                quantity: item.quantity,
                error: `Sản phẩm không tồn tại: ${item.product_id}`,
              });
              continue;
            }

            const availableQty =
              product.available_quantity - product.reserved_quantity;

            if (availableQty < item.quantity) {
              results.push({
                success: false,
                product_id: item.product_id,
                quantity: item.quantity,
                error: `Không đủ tồn kho. Có sẵn: ${availableQty}, Yêu cầu: ${item.quantity}`,
              });
              continue;
            }

            // Create reservation record
            const reservation = await tx.stockReservation.create({
              data: {
                product_id: item.product_id,
                order_id: dto.order_id,
                quantity: item.quantity,
                status: 'PENDING',
                expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
              },
            });

            // Update reserved quantity
            await tx.product.update({
              where: { id: item.product_id },
              data: {
                reserved_quantity: {
                  increment: item.quantity,
                },
              },
            });

            results.push({
              success: true,
              reservation_id: reservation.id,
              product_id: item.product_id,
              quantity: item.quantity,
            });

            // Check low stock after reservation
            const updatedProduct = await tx.product.findUnique({
              where: { id: item.product_id },
            });
            if (updatedProduct) {
              await this.checkAndEmitLowStockAlert(updatedProduct);
            }
          }
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 10000,
        },
      );
    } catch (error) {
      this.logger.error(`Error reserving stock: ${error.message}`);
      throw new RpcException({
        statusCode: 500,
        message: 'Không thể đặt trước tồn kho',
      });
    }

    return results;
  }

  /**
   * Release reserved stock
   */
  async releaseStock(dto: ReleaseStockDto): Promise<StockReleaseResult[]> {
    this.logger.log(`Releasing stock for order: ${dto.order_id || 'N/A'}`);

    const results: StockReleaseResult[] = [];

    try {
      await this.prisma.$transaction(async (tx) => {
        let reservations: any[] = [];

        if (dto.order_id) {
          reservations = await tx.stockReservation.findMany({
            where: {
              order_id: dto.order_id,
              status: 'PENDING',
            },
          });
        } else if (dto.reservation_ids && dto.reservation_ids.length > 0) {
          reservations = await tx.stockReservation.findMany({
            where: {
              id: { in: dto.reservation_ids },
              status: 'PENDING',
            },
          });
        }

        for (const reservation of reservations) {
          // Update reservation status
          await tx.stockReservation.update({
            where: { id: reservation.id },
            data: { status: 'RELEASED' },
          });

          // Decrease reserved quantity
          await tx.product.update({
            where: { id: reservation.product_id },
            data: {
              reserved_quantity: {
                decrement: reservation.quantity,
              },
            },
          });

          results.push({
            success: true,
            released_quantity: reservation.quantity,
            product_id: reservation.product_id,
          });
        }
      });
    } catch (error) {
      this.logger.error(`Error releasing stock: ${error.message}`);
      throw new RpcException({
        statusCode: 500,
        message: 'Không thể giải phóng tồn kho',
      });
    }

    return results;
  }

  /**
   * Confirm reservation (deduct from available quantity)
   */
  async confirmReservation(orderId: string): Promise<{ success: boolean }> {
    this.logger.log(`Confirming reservations for order: ${orderId}`);

    try {
      await this.prisma.$transaction(async (tx) => {
        const reservations = await tx.stockReservation.findMany({
          where: {
            order_id: orderId,
            status: 'PENDING',
          },
        });

        for (const reservation of reservations) {
          // Update reservation status
          await tx.stockReservation.update({
            where: { id: reservation.id },
            data: { status: 'CONFIRMED' },
          });

          // Deduct from both available and reserved
          await tx.product.update({
            where: { id: reservation.product_id },
            data: {
              available_quantity: {
                decrement: reservation.quantity,
              },
              reserved_quantity: {
                decrement: reservation.quantity,
              },
            },
          });

          // Check low stock after confirmation
          const product = await tx.product.findUnique({
            where: { id: reservation.product_id },
          });
          if (product) {
            await this.checkAndEmitLowStockAlert(product);
          }
        }
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error confirming reservation: ${error.message}`);
      throw new RpcException({
        statusCode: 500,
        message: 'Không thể xác nhận đặt trước',
      });
    }
  }

  /**
   * Check stock availability
   */
  async checkAvailability(
    dto: CheckAvailabilityDto,
  ): Promise<StockAvailabilityResult[]> {
    this.logger.log(`Checking availability for ${dto.items.length} items`);

    const productIds = dto.items.map((item) => item.product_id);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    return dto.items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);

      if (!product) {
        return {
          product_id: item.product_id,
          name: 'Unknown',
          requested_quantity: item.quantity,
          available_quantity: 0,
          is_available: false,
          shortfall: item.quantity,
        };
      }

      const availableQty = product.available_quantity - product.reserved_quantity;
      const isAvailable = availableQty >= item.quantity;

      return {
        product_id: product.id,
        name: product.name,
        requested_quantity: item.quantity,
        available_quantity: availableQty,
        is_available: isAvailable,
        shortfall: isAvailable ? undefined : item.quantity - availableQty,
      };
    });
  }

  // ============================================
  // LOW STOCK ALERTS
  // ============================================

  /**
   * Check and emit low stock alert if needed
   */
  private async checkAndEmitLowStockAlert(product: any): Promise<void> {
    const availableQty = product.available_quantity - product.reserved_quantity;

    if (availableQty <= product.low_stock_threshold) {
      this.logger.warn(
        `LOW STOCK ALERT: ${product.name} (ID: ${product.id}) - Current: ${availableQty}, Threshold: ${product.low_stock_threshold}`,
      );

      // TODO: In production, emit event via RabbitMQ for notification service
      // const alert: LowStockAlert = {
      //   product_id: product.id,
      //   product_name: product.name,
      //   current_quantity: availableQty,
      //   threshold: product.low_stock_threshold,
      //   timestamp: new Date(),
      // };
      // this.eventEmitter.emit(EVENT_PATTERNS.LOW_STOCK_ALERT, alert);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Map Prisma product to ProductDetails interface
   */
  private mapToProductDetails(product: any): ProductDetails {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      unit_price: Number(product.unit_price),
      available_quantity: product.available_quantity,
      reserved_quantity: product.reserved_quantity,
      low_stock_threshold: product.low_stock_threshold,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }

  /**
   * Invalidate all product-related caches
   */
  private async invalidateProductCaches(productId: string): Promise<void> {
    try {
      await Promise.all([
        this.cacheService.del(CACHE_KEYS.PRODUCTS.DETAIL(productId)),
        this.cacheService.del(CACHE_KEYS.INVENTORY.DETAIL(productId)),
        this.cacheService.del(CACHE_KEYS.INVENTORY.STOCK(productId)),
      ]);
      this.logger.log(`Cache invalidated for product: ${productId}`);
    } catch (error) {
      this.logger.error(`Error invalidating cache for product ${productId}:`, error.message);
    }
  }
}
