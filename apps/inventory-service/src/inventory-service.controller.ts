import { Controller } from '@nestjs/common';
import { InventoryService } from './inventory-service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from 'libs/common/constants/patterns';
import { CreateProductDto } from 'libs/common/dto/product/create-product.dto';
import { UpdateProductDto } from 'libs/common/dto/product/update-product.dto';
import {
  ReserveStockDto,
  ReleaseStockDto,
  CheckAvailabilityDto,
} from 'libs/common/dto/product/stock.dto';

@Controller()
export class InventoryServiceController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ============================================
  // PRODUCT CRUD
  // ============================================

  /**
   * Create new product
   */
  @MessagePattern(MESSAGE_PATTERNS.CREATE_PRODUCT)
  async createProduct(@Payload() dto: CreateProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  /**
   * Get product by ID
   */
  @MessagePattern(MESSAGE_PATTERNS.GET_PRODUCT)
  async getProduct(@Payload() productId: string) {
    return this.inventoryService.getProductById(productId);
  }

  /**
   * Update product
   */
  @MessagePattern(MESSAGE_PATTERNS.UPDATE_PRODUCT)
  async updateProduct(
    @Payload() payload: { productId: string; data: UpdateProductDto },
  ) {
    return this.inventoryService.updateProduct(payload.productId, payload.data);
  }

  /**
   * Delete product
   */
  @MessagePattern(MESSAGE_PATTERNS.DELETE_PRODUCT)
  async deleteProduct(@Payload() productId: string) {
    return this.inventoryService.deleteProduct(productId);
  }

  // ============================================
  // INVENTORY OPERATIONS
  // ============================================

  /**
   * Get inventory details for multiple products (backward compatible)
   */
  @MessagePattern(MESSAGE_PATTERNS.GET_INVENTORY_DETAILS)
  async getInventoryDetails(
    @Payload() items: { productId: string; quantity: number }[],
  ) {
    return this.inventoryService.getInventoryDetails(items);
  }

  /**
   * Check stock availability
   */
  @MessagePattern(MESSAGE_PATTERNS.CHECK_AVAILABILITY)
  async checkAvailability(@Payload() dto: CheckAvailabilityDto) {
    return this.inventoryService.checkAvailability(dto);
  }

  // ============================================
  // STOCK RESERVATION
  // ============================================

  /**
   * Reserve stock for an order
   */
  @MessagePattern(MESSAGE_PATTERNS.RESERVE_STOCK)
  async reserveStock(@Payload() dto: ReserveStockDto) {
    return this.inventoryService.reserveStock(dto);
  }

  /**
   * Release reserved stock
   */
  @MessagePattern(MESSAGE_PATTERNS.RELEASE_STOCK)
  async releaseStock(@Payload() dto: ReleaseStockDto) {
    return this.inventoryService.releaseStock(dto);
  }

  /**
   * Confirm reservation (deduct from available quantity)
   */
  @MessagePattern(MESSAGE_PATTERNS.CONFIRM_RESERVATION)
  async confirmReservation(@Payload() orderId: string) {
    return this.inventoryService.confirmReservation(orderId);
  }
}
