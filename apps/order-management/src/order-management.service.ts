import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from 'libs/common/constants/patterns';
import { CUSTOMER_SERVICE, INVENTORY_SERVICE } from 'libs/common/constants/services';
import { CreateOrderDto } from 'libs/common/dto/create-order.dto';
import { UpdateOrderDto } from 'libs/common/dto/update-order.dto';
import { OrderStatus } from 'libs/common/constants/order-status';
import {
  CustomerDetails,
  CustomerValidationResult,
} from 'libs/common/interfaces/customer.interface';
import {
  InventoryItem,
  StockReservationResult,
} from 'libs/common/interfaces/inventory.interface';
import { OrderIdDto } from 'libs/common/dto/order-id.dto';
import { PrismaService } from 'libs/common/database/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrderManagementService {
  private readonly logger = new Logger(OrderManagementService.name);

  constructor(
    @Inject(CUSTOMER_SERVICE) private readonly customerClient: ClientProxy,
    @Inject(INVENTORY_SERVICE) private readonly inventoryClient: ClientProxy,
    private readonly prisma: PrismaService,
  ) {}

  async handleGetAllOrders(customerId: string) {
    this.logger.log(`Fetching all orders for customer: ${customerId}`);
    try {
      const orders = await this.prisma.order.findMany({
        include: {
          line_items: true,
          customer: true,
        },
        orderBy: { created_at: 'desc' },
      });
      return orders;
    } catch (error) {
      this.logger.error('Error fetching orders:', error);
      throw new RpcException('Failed to fetch orders');
    }
  }

  async handleGetOrderById(orderId: OrderIdDto) {
    this.logger.log(`Fetching order with ID: ${orderId.orderId}`);
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId.orderId },
        include: {
          line_items: true,
          customer: true,
        },
      });
      if (!order) throw new RpcException('Order not found');
      return order;
    } catch (error) {
      this.logger.error('Error fetching order:', error);
      throw new RpcException('Failed to fetch order');
    }
  }

  async handleCreateOrder(order: CreateOrderDto) {
    this.logger.log(`Creating order for customer: ${order.customerId}`);

    try {
      // Step 1: Validate customer
      this.logger.log('Step 1: Validating customer...');
      const customerValidation: CustomerValidationResult = await firstValueFrom(
        this.customerClient.send(MESSAGE_PATTERNS.VALIDATE_CUSTOMER, order.customerId),
      );

      if (!customerValidation.is_valid) {
        throw new RpcException({
          statusCode: 400,
          message: customerValidation.error || 'Customer validation failed',
        });
      }

      const customerDetails = customerValidation.customer as CustomerDetails;
      this.logger.log(`Customer validated: ${customerDetails.name}`);

      // Step 2: Check inventory availability
      this.logger.log('Step 2: Checking inventory availability...');
      const inventoryDetails: InventoryItem[] = await firstValueFrom(
        this.inventoryClient.send(MESSAGE_PATTERNS.GET_INVENTORY_DETAILS, order.items),
      );

      // Check if all items are available
      const unavailableItems = inventoryDetails.filter((item) => !item.is_available);
      if (unavailableItems.length > 0) {
        const unavailableList = unavailableItems
          .map((item) => `${item.name} (yêu cầu: ${item.requested_quantity}, có: ${item.available_quantity})`)
          .join(', ');

        throw new RpcException({
          statusCode: 400,
          message: `Không đủ tồn kho cho các sản phẩm: ${unavailableList}`,
          data: { unavailable_items: unavailableItems },
        });
      }

      // Step 3: Reserve stock
      this.logger.log('Step 3: Reserving stock...');
      const reserveDto = {
        items: order.items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
      };

      const reservationResults: StockReservationResult[] = await firstValueFrom(
        this.inventoryClient.send(MESSAGE_PATTERNS.RESERVE_STOCK, reserveDto),
      );

      // Check if all reservations succeeded
      const failedReservations = reservationResults.filter((r) => !r.success);
      if (failedReservations.length > 0) {
        // Release any successful reservations
        const successfulReservationIds = reservationResults
          .filter((r) => r.success && r.reservation_id)
          .map((r) => r.reservation_id as string);

        if (successfulReservationIds.length > 0) {
          await firstValueFrom(
            this.inventoryClient.send(MESSAGE_PATTERNS.RELEASE_STOCK, {
              reservation_ids: successfulReservationIds,
            }),
          );
        }

        const failedList = failedReservations
          .map((r) => `${r.product_id}: ${r.error}`)
          .join(', ');

        throw new RpcException({
          statusCode: 400,
          message: `Không thể đặt trước tồn kho: ${failedList}`,
        });
      }

      // Step 4: Create order in database
      this.logger.log('Step 4: Creating order in database...');
      const lineItems = inventoryDetails.map((item) => ({
        product_id: item.id,
        quantity: item.requested_quantity,
        unit_price: item.unit_price,
      }));

      const totalAmount = inventoryDetails.reduce(
        (sum, item) => sum + item.unit_price * item.requested_quantity,
        0,
      );

      const newOrder = await this.prisma.order.create({
        data: {
          customer_id: order.customerId,
          shipping_address: order.shippingAddress || customerDetails.shipping_address || '',
          status: OrderStatus.PROCESSING,
          total_amount: totalAmount,
          line_items: { create: lineItems },
        },
        include: {
          line_items: true,
          customer: true,
        },
      });

      // Step 5: Confirm stock reservation with order ID
      this.logger.log('Step 5: Confirming stock reservation...');
      await firstValueFrom(
        this.inventoryClient.send(MESSAGE_PATTERNS.CONFIRM_RESERVATION, newOrder.id),
      );

      this.logger.log(`Order created successfully: ${newOrder.id}`);
      return newOrder;
    } catch (error) {
      this.logger.error('Error creating order:', error);

      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        statusCode: 500,
        message: 'Failed to create order',
        error: error.message,
      });
    }
  }

  async handleUpdateOrder(updateOrderDto: UpdateOrderDto) {
    this.logger.log(`Updating order: ${updateOrderDto.orderId}`);

    try {
      // Check if order exists
      const existingOrder = await this.prisma.order.findUnique({
        where: { id: updateOrderDto.orderId },
      });

      if (!existingOrder) {
        throw new RpcException({
          statusCode: 404,
          message: `Order not found: ${updateOrderDto.orderId}`,
        });
      }

      // If cancelling order, release stock
      if (
        updateOrderDto.status === OrderStatus.CANCELED &&
        existingOrder.status !== OrderStatus.CANCELED
      ) {
        this.logger.log('Order cancelled - releasing stock...');
        await firstValueFrom(
          this.inventoryClient.send(MESSAGE_PATTERNS.RELEASE_STOCK, {
            order_id: updateOrderDto.orderId,
          }),
        );
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id: updateOrderDto.orderId },
        data: {
          ...(updateOrderDto.status && { status: updateOrderDto.status }),
          ...(updateOrderDto.trackingNumber && { tracking_number: updateOrderDto.trackingNumber }),
          ...(updateOrderDto.trackingCompany && { tracking_company: updateOrderDto.trackingCompany }),
        },
        include: {
          line_items: true,
          customer: true,
        },
      });

      this.logger.log(`Order updated: ${updatedOrder.id}`);
      return updatedOrder;
    } catch (error) {
      this.logger.error('Error updating order:', error);

      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        statusCode: 500,
        message: 'Failed to update order',
      });
    }
  }

  async handleDeleteOrder(orderId: OrderIdDto) {
    this.logger.log(`Deleting order with ID: ${orderId.orderId}`);

    try {
      // Get order to check status
      const order = await this.prisma.order.findUnique({
        where: { id: orderId.orderId },
      });

      if (!order) {
        throw new RpcException({
          statusCode: 404,
          message: `Order not found: ${orderId.orderId}`,
        });
      }

      // Release stock if order was processing
      if (order.status === OrderStatus.PROCESSING) {
        this.logger.log('Releasing stock for deleted order...');
        await firstValueFrom(
          this.inventoryClient.send(MESSAGE_PATTERNS.RELEASE_STOCK, {
            order_id: orderId.orderId,
          }),
        );
      }

      await this.prisma.order.delete({
        where: { id: orderId.orderId },
      });

      this.logger.log(`Order deleted: ${orderId.orderId}`);
      return { success: true, message: 'Order deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting order:', error);

      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        statusCode: 500,
        message: 'Failed to delete order',
      });
    }
  }
}

