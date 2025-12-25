import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { UserPreferenceService } from './user-preference.service';
import { EVENT_PATTERNS, MESSAGE_PATTERNS } from 'libs/common/constants/patterns';

// Notification-specific patterns
export const NOTIFICATION_PATTERNS = {
  // Message patterns
  SEND_NOTIFICATION: 'notification.send',
  GET_TEMPLATES: 'notification.templates.get',
  CREATE_TEMPLATE: 'notification.template.create',
  GET_PREFERENCES: 'notification.preferences.get',
  UPDATE_PREFERENCES: 'notification.preferences.update',
  UNSUBSCRIBE: 'notification.unsubscribe',
  GET_HISTORY: 'notification.history.get',
};

@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly userPreferenceService: UserPreferenceService,
  ) {}

  // ============== Event Handlers ==============

  /**
   * Handle order created events
   */
  @EventPattern(EVENT_PATTERNS.ORDER_CREATED)
  async handleOrderCreated(@Payload() data: { orderId: string }) {
    this.logger.log(`Order created event received: ${data.orderId}`);
    try {
      await this.notificationService.sendOrderConfirmation(data.orderId);
      this.logger.log(`Order confirmation sent for: ${data.orderId}`);
    } catch (error) {
      this.logger.error(`Failed to send order confirmation: ${error}`);
    }
  }

  /**
   * Handle order cancelled events
   */
  @EventPattern(EVENT_PATTERNS.ORDER_CANCELLED)
  async handleOrderCancelled(@Payload() data: { orderId: string; reason?: string }) {
    this.logger.log(`Order cancelled event received: ${data.orderId}`);
    // TODO: Implement order cancellation notification
  }

  /**
   * Handle low stock events
   */
  @EventPattern(EVENT_PATTERNS.LOW_STOCK_ALERT)
  async handleLowStock(@Payload() data: { productId: string; currentStock: number }) {
    this.logger.log(`Low stock event received: ${data.productId}`);
    try {
      await this.notificationService.sendLowStockAlert(data.productId, data.currentStock);
      this.logger.log(`Low stock alert sent for: ${data.productId}`);
    } catch (error) {
      this.logger.error(`Failed to send low stock alert: ${error}`);
    }
  }

  // ============== Message Patterns ==============

  /**
   * Send a notification
   */
  @MessagePattern(NOTIFICATION_PATTERNS.SEND_NOTIFICATION)
  async sendNotification(
    @Payload() data: { templateKey: string; recipient: string; data: Record<string, any> },
  ) {
    this.logger.log(`Send notification request: ${data.templateKey}`);
    return this.notificationService.sendNotification(data);
  }

  /**
   * Get all templates
   */
  @MessagePattern(NOTIFICATION_PATTERNS.GET_TEMPLATES)
  async getTemplates(@Payload() data: { active?: boolean }) {
    return this.notificationService.getTemplates(data?.active);
  }

  /**
   * Create a new template
   */
  @MessagePattern(NOTIFICATION_PATTERNS.CREATE_TEMPLATE)
  async createTemplate(
    @Payload()
    data: {
      key: string;
      name: string;
      description?: string;
      workflowId: string;
      variables?: Record<string, any>;
    },
  ) {
    return this.notificationService.createTemplate(data);
  }

  /**
   * Get user preferences
   */
  @MessagePattern(NOTIFICATION_PATTERNS.GET_PREFERENCES)
  async getPreferences(@Payload() data: { userId: string }) {
    return this.userPreferenceService.getUserPreferences(data.userId);
  }

  /**
   * Update user preferences
   */
  @MessagePattern(NOTIFICATION_PATTERNS.UPDATE_PREFERENCES)
  async updatePreferences(@Payload() data: { userId: string; preferences: Record<string, any> }) {
    return this.userPreferenceService.updateUserPreferences(data.userId, data.preferences);
  }

  /**
   * Unsubscribe user from notifications
   */
  @MessagePattern(NOTIFICATION_PATTERNS.UNSUBSCRIBE)
  async unsubscribe(@Payload() data: { userId: string; channel?: string }) {
    return this.userPreferenceService.unsubscribe(data.userId, data.channel);
  }

  /**
   * Get notification history
   */
  @MessagePattern(NOTIFICATION_PATTERNS.GET_HISTORY)
  async getHistory(
    @Payload()
    query: {
      userId?: string;
      templateKey?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    return this.notificationService.getNotificationHistory({
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }
}
