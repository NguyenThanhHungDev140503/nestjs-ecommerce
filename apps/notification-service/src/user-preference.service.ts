import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'libs/common/database/prisma.service';

export interface UserPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  globalOptOut: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  email: true,
  sms: true,
  push: true,
  inApp: true,
  globalOptOut: false,
};

@Injectable()
export class UserPreferenceService {
  private readonly logger = new Logger(UserPreferenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user preferences or return defaults
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      return DEFAULT_PREFERENCES;
    }

    return {
      ...DEFAULT_PREFERENCES,
      ...(preferences.preferences as Record<string, any>),
    };
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...preferences };

    await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        preferences: updated,
        updatedAt: new Date(),
      },
      create: {
        userId,
        preferences: updated,
      },
    });

    this.logger.log(`Updated preferences for user: ${userId}`);
    return updated;
  }

  /**
   * Unsubscribe from a specific channel or all notifications
   */
  async unsubscribe(userId: string, channel?: string): Promise<UserPreferences> {
    const current = await this.getUserPreferences(userId);

    if (channel) {
      // Unsubscribe from specific channel
      if (channel in current) {
        (current as any)[channel] = false;
      }
    } else {
      // Global opt-out
      current.globalOptOut = true;
    }

    return this.updateUserPreferences(userId, current);
  }

  /**
   * Resubscribe to a specific channel or all notifications
   */
  async resubscribe(userId: string, channel?: string): Promise<UserPreferences> {
    const current = await this.getUserPreferences(userId);

    if (channel) {
      // Resubscribe to specific channel
      if (channel in current) {
        (current as any)[channel] = true;
      }
    } else {
      // Remove global opt-out
      current.globalOptOut = false;
    }

    return this.updateUserPreferences(userId, current);
  }

  /**
   * Check if user should receive notification on a specific channel
   */
  async shouldNotify(userId: string, channel: string): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);

    if (preferences.globalOptOut) {
      return false;
    }

    return (preferences as any)[channel] !== false;
  }
}
