import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'libs/common/database/prisma.service';
import { NovuService } from './novu/novu.service';

export interface SendNotificationDto {
  templateKey: string;
  recipient: string;
  data: Record<string, any>;
  channels?: string[];
}

export interface NotificationHistoryQuery {
  userId?: string;
  templateKey?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly novuService: NovuService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation(orderId: string) {
    this.logger.log(`Sending order confirmation for order: ${orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        line_items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    return this.novuService.triggerWorkflow({
      workflowId: 'order-confirmation',
      subscriberId: order.customer_id,
      payload: {
        user: {
          firstName: order.customer.name?.split(' ')[0] || 'Customer',
          email: order.customer.email,
          phone: order.customer.phone,
        },
        order: {
          id: order.id,
          total: order.total_amount.toString(),
          shippingAddress: order.shipping_address,
          items: order.line_items.map((item) => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.unit_price.toString(),
          })),
        },
      },
    });
  }

  /**
   * Send shipping update notification
   */
  async sendShippingUpdate(
    orderId: string,
    update: { trackingNumber?: string; trackingCompany?: string; status: string },
  ) {
    this.logger.log(`Sending shipping update for order: ${orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    return this.novuService.triggerWorkflow({
      workflowId: 'shipping-update',
      subscriberId: order.customer_id,
      payload: {
        user: {
          firstName: order.customer.name?.split(' ')[0] || 'Customer',
          email: order.customer.email,
        },
        order: {
          id: order.id,
          trackingNumber: update.trackingNumber || order.tracking_number,
          trackingCompany: update.trackingCompany || order.tracking_company,
          status: update.status,
        },
      },
    });
  }

  /**
   * Send low stock alert to admin users
   */
  async sendLowStockAlert(productId: string, currentStock: number) {
    this.logger.log(`Sending low stock alert for product: ${productId}`);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Get all admin users
    const adminUsers = await this.prisma.customer.findMany({
      where: { role: 'ADMIN' },
    });

    const results = await Promise.allSettled(
      adminUsers.map((admin) =>
        this.novuService.triggerWorkflow({
          workflowId: 'low-stock-alert',
          subscriberId: admin.id,
          payload: {
            user: {
              firstName: admin.name?.split(' ')[0] || 'Admin',
              email: admin.email,
            },
            product: {
              id: product.id,
              name: product.name,
              currentStock,
              threshold: product.low_stock_threshold,
            },
          },
        }),
      ),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    this.logger.log(`Low stock alerts sent: ${successCount}/${adminUsers.length}`);

    return { sent: successCount, total: adminUsers.length };
  }

  /**
   * Send generic notification
   */
  async sendNotification(dto: SendNotificationDto) {
    this.logger.log(`Sending notification: ${dto.templateKey} to ${dto.recipient}`);

    return this.novuService.triggerWorkflow({
      workflowId: dto.templateKey,
      subscriberId: dto.recipient,
      payload: dto.data,
    });
  }

  /**
   * Get notification history with pagination
   */
  async getNotificationHistory(query: NotificationHistoryQuery) {
    const { userId, templateKey, status, startDate, endDate, page = 1, limit = 10 } = query;

    const where: any = {};

    if (userId) where.recipient = userId;
    if (templateKey) where.templateKey = templateKey;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all notification templates
   */
  async getTemplates(active?: boolean) {
    const where = active !== undefined ? { active } : {};

    return this.prisma.notificationTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new notification template
   */
  async createTemplate(data: {
    key: string;
    name: string;
    description?: string;
    workflowId: string;
    variables?: Record<string, any>;
  }) {
    return this.prisma.notificationTemplate.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description,
        workflowId: data.workflowId,
        variables: data.variables,
      },
    });
  }
}
