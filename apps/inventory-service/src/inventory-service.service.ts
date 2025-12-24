import { Injectable } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from 'libs/common/constants/patterns';
import { PrismaService } from 'libs/common/database/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  @MessagePattern(MESSAGE_PATTERNS.GET_INVENTORY_DETAILS)
  async getInventoryDetails(items: { productId: string; quantity: number }[]) {
    console.log('Inventory Service received request for:', items);

    // Query real products from database
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    // Map products with requested quantities
    const inventoryResponse = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        return {
          id: item.productId,
          name: `Product ${item.productId} not found`,
          description: 'Product does not exist',
          quantity_available: 0,
          requested_quantity: item.quantity,
          unit_price: 0,
          total_price: 0,
          is_available: false,
        };
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        quantity_available: Number(product.available_quantity),
        requested_quantity: item.quantity,
        unit_price: Number(product.unit_price),
        total_price: Number(product.unit_price) * item.quantity,
        is_available: Number(product.available_quantity) >= item.quantity,
      };
    });

    console.log('Inventory Service response:', inventoryResponse);
    return inventoryResponse;
  }
}
