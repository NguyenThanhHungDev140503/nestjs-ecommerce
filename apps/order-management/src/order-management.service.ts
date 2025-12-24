import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from 'libs/common/constants/patterns';
import { CUSTOMER_SERVICE, INVENTORY_SERVICE } from 'libs/common/constants/services';
import { CreateOrderDto } from 'libs/common/dto/create-order.dto';
import { UpdateOrderDto } from 'libs/common/dto/update-order.dto';
import { OrderStatus } from 'libs/common/constants/order-status';
import { CustomerDetails } from 'libs/common/interfaces/customer.interface';
import { InventoryItem } from 'libs/common/interfaces/inventory.interface';
import { OrderIdDto } from 'libs/common/dto/order-id.dto';
import { PrismaService } from 'libs/common/database/prisma.service';

@Injectable()
export class OrderManagementService {
  constructor(
    @Inject(CUSTOMER_SERVICE) private readonly customerClient: ClientProxy,
    @Inject(INVENTORY_SERVICE) private readonly inventoryClient: ClientProxy,
    private readonly prisma: PrismaService,
  ) {}

  async handleGetAllOrders(customerId: string) {
    console.log(`Fetching all orders for customer: ${customerId}`);
    try {
      const orders = await this.prisma.order.findMany();
      console.log('Orders:', orders);
      return orders;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw new RpcException('Failed to fetch orders');
    }
  }

  async handleGetOrderById(orderId: OrderIdDto) {
    console.log(`Fetching order with ID: ${orderId.orderId}`);
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId.orderId },
        include: { line_items: true },
      });
      if (!order) throw new RpcException('Order not found');
      return order;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw new RpcException('Failed to fetch order');
    }
  }

  async handleCreateOrder(order: CreateOrderDto) {
    console.log('Creating order:', order);
    try {
      const customerDetails: CustomerDetails = await this.customerClient
        .send(MESSAGE_PATTERNS.GET_CUSTOMER_DETAILS, order.customerId)
        .toPromise();
      console.log('Customer details:', customerDetails);

      const inventoryDetails: InventoryItem[] = await this.inventoryClient
        .send(MESSAGE_PATTERNS.GET_INVENTORY_DETAILS, order.items)
        .toPromise();
      console.log('Inventory details:', inventoryDetails);

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
          shipping_address: order.shippingAddress,
          status: OrderStatus.PROCESSING,
          total_amount: totalAmount,
          line_items: { create: lineItems },
        },
        include: { line_items: true },
      });

      console.log('Order created:', newOrder);
      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new RpcException('Failed to create order');
    }
  }

  async handleUpdateOrder(updateOrderDto: UpdateOrderDto) {
    console.log('Updating order:', updateOrderDto);
    try {
      const updatedOrder = await this.prisma.order.update({
        where: { id: updateOrderDto.orderId },
        data: {
          status: updateOrderDto.status,
          tracking_number: updateOrderDto.trackingNumber,
          tracking_company: updateOrderDto.trackingCompany,
        },
      });
      console.log('Order updated:', updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order:', error);
      throw new RpcException('Failed to update order');
    }
  }

  async handleDeleteOrder(orderId: OrderIdDto) {
    console.log(`Deleting order with ID: ${orderId.orderId}`);
    try {
      await this.prisma.order.delete({
        where: { id: orderId.orderId },
      });
      return { message: 'Order deleted successfully' };
    } catch (error) {
      console.error('Error deleting order:', error);
      throw new RpcException('Failed to delete order');
    }
  }
}

