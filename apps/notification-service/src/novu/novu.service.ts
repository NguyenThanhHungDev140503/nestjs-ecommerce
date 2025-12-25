import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Novu } from '@novu/api';
import { PrismaService } from 'libs/common/database/prisma.service';

export interface TriggerWorkflowOptions {
  workflowId: string;
  subscriberId: string;
  payload: Record<string, any>;
  overrides?: Record<string, any>;
}

export interface TriggerWorkflowResult {
  success: boolean;
  data?: any;
  message?: string;
}

@Injectable()
export class NovuService implements OnModuleInit {
  private novu: Novu | null = null;
  private readonly logger = new Logger(NovuService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const apiKey = this.configService.get<string>('notification.novu.apiKey');
    const backendUrl = this.configService.get<string>('notification.novu.backendUrl');

    if (!apiKey) {
      this.logger.warn('NOVU_API_KEY not configured. Novu integration will be disabled.');
      return;
    }

    // @novu/api SDK initialization
    this.novu = new Novu({
      apiKey: apiKey,
      serverURL: backendUrl,
    });

    this.logger.log('Novu client initialized successfully');
  }

  async triggerWorkflow(options: TriggerWorkflowOptions): Promise<TriggerWorkflowResult> {
    const { workflowId, subscriberId, payload, overrides = {} } = options;

    if (!this.novu) {
      this.logger.error('Novu client not initialized');
      return { success: false, message: 'Novu client not initialized' };
    }

    try {
      // Check user preferences
      const preferences = await this.prisma.notificationPreference.findUnique({
        where: { userId: subscriberId },
      });

      // Check if user has opted out
      const userPrefs = preferences?.preferences as Record<string, any> | null;
      if (userPrefs?.globalOptOut === true) {
        this.logger.log(`User ${subscriberId} has opted out of notifications`);
        return { success: false, message: 'User has opted out of notifications' };
      }

      // Build the subscriber data
      const subscriberData: any = {
        subscriberId,
      };
      
      // Add user data if provided
      if (payload.user?.email) {
        subscriberData.email = payload.user.email;
      }
      if (payload.user?.phone) {
        subscriberData.phone = payload.user.phone;
      }
      if (payload.user?.firstName) {
        subscriberData.firstName = payload.user.firstName;
      }

      // Trigger the workflow using novu.trigger()
      // SDK uses 'name' for workflow identifier and 'to' for recipient
      const result = await this.novu.trigger({
        name: workflowId,
        to: subscriberData,
        payload: {
          ...payload,
          preferences: userPrefs,
        },
        overrides: overrides as any,
      });

      // Log the notification
      await this.prisma.notificationLog.create({
        data: {
          templateKey: workflowId,
          channel: 'multi',
          status: 'pending',
          recipient: subscriberId,
          payload: payload,
        },
      });

      this.logger.log(`Workflow ${workflowId} triggered for subscriber ${subscriberId}`);
      return { success: true, data: result };
    } catch (error) {
      this.logger.error(`Failed to trigger workflow ${workflowId}:`, error);

      // Log failed notification
      await this.prisma.notificationLog.create({
        data: {
          templateKey: workflowId,
          channel: 'multi',
          status: 'failed',
          recipient: subscriberId,
          payload: payload,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  async getSubscriber(subscriberId: string) {
    if (!this.novu) {
      return null;
    }

    try {
      // Use subscribers.retrieve to get subscriber
      return await this.novu.subscribers.retrieve(subscriberId);
    } catch (error) {
      this.logger.error(`Failed to get subscriber ${subscriberId}:`, error);
      return null;
    }
  }

  async createOrUpdateSubscriber(subscriberId: string, data: Record<string, any>) {
    if (!this.novu) {
      return null;
    }

    try {
      // Use subscribers.create for creating/updating
      return await this.novu.subscribers.create({
        subscriberId,
        ...data,
      });
    } catch (error) {
      this.logger.error(`Failed to create/update subscriber ${subscriberId}:`, error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return !!this.novu;
  }
}
