import { registerAs } from '@nestjs/config';

export default registerAs('notification', () => ({
  // RabbitMQ Configuration
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    queue: process.env.RABBITMQ_NOTIFICATION_QUEUE || 'notification-queue',
    exchange: process.env.RABBITMQ_NOTIFICATION_EXCHANGE || 'notification-exchange',
  },

  // Novu Configuration
  novu: {
    apiKey: process.env.NOVU_API_KEY || '',
    appId: process.env.NOVU_APP_ID || '',
    apiUrl: process.env.NOVU_API_URL || 'http://localhost:3000', // Self-hosted Novu
    backendUrl: process.env.NOVU_BACKEND_URL || 'http://localhost:3000',
  },

  // Notification Channels Configuration
  channels: {
    email: {
      enabled: process.env.NOTIFICATION_EMAIL_ENABLED === 'true',
      provider: process.env.EMAIL_PROVIDER || 'novu',
    },
    sms: {
      enabled: process.env.NOTIFICATION_SMS_ENABLED === 'true',
      provider: process.env.SMS_PROVIDER || 'novu',
    },
    push: {
      enabled: process.env.NOTIFICATION_PUSH_ENABLED === 'true',
      provider: process.env.PUSH_PROVIDER || 'novu',
    },
    inApp: {
      enabled: process.env.NOTIFICATION_INAPP_ENABLED !== 'false', // Enabled by default
    },
  },

  // Retry Configuration
  retry: {
    maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3', 10),
    baseDelay: parseInt(process.env.NOTIFICATION_RETRY_BASE_DELAY || '1000', 10),
    maxDelay: parseInt(process.env.NOTIFICATION_RETRY_MAX_DELAY || '30000', 10),
  },

  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.NOTIFICATION_RATE_LIMIT_TTL || '60', 10),
    limit: parseInt(process.env.NOTIFICATION_RATE_LIMIT || '100', 10),
  },

  // Logging
  logging: {
    level: process.env.NOTIFICATION_LOG_LEVEL || 'info',
    enableMetrics: process.env.NOTIFICATION_METRICS_ENABLED === 'true',
  },
}));
