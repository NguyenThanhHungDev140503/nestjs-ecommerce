import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { INVENTORY_SERVICE } from 'libs/common/constants/services';
import { MESSAGE_PATTERNS } from 'libs/common/constants/patterns';
import { CreateProductDto } from 'libs/common/dto/product/create-product.dto';
import { UpdateProductDto } from 'libs/common/dto/product/update-product.dto';
import { CheckAvailabilityDto } from 'libs/common/dto/product/stock.dto';

@Injectable()
export class ProductGatewayService {
  constructor(
    @Inject(INVENTORY_SERVICE) private readonly inventoryClient: ClientProxy,
  ) {}

  getProductById(productId: string) {
    return this.inventoryClient.send(MESSAGE_PATTERNS.GET_PRODUCT, productId);
  }

  createProduct(dto: CreateProductDto) {
    return this.inventoryClient.send(MESSAGE_PATTERNS.CREATE_PRODUCT, dto);
  }

  updateProduct(productId: string, dto: UpdateProductDto) {
    return this.inventoryClient.send(MESSAGE_PATTERNS.UPDATE_PRODUCT, {
      productId,
      data: dto,
    });
  }

  deleteProduct(productId: string) {
    return this.inventoryClient.send(MESSAGE_PATTERNS.DELETE_PRODUCT, productId);
  }

  checkAvailability(dto: CheckAvailabilityDto) {
    return this.inventoryClient.send(MESSAGE_PATTERNS.CHECK_AVAILABILITY, dto);
  }

  getInventoryDetails(items: { productId: string; quantity: number }[]) {
    return this.inventoryClient.send(MESSAGE_PATTERNS.GET_INVENTORY_DETAILS, items);
  }
}

