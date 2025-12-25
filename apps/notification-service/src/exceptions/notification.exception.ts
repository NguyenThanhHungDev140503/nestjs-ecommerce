export class NotificationException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'NotificationException';
  }
}

export class NovuException extends NotificationException {
  public readonly originalError?: any;

  constructor(message: string, originalError?: any, details?: any) {
    super(message, 'NOVU_ERROR', 502, details);
    this.originalError = originalError;
  }
}

export class TemplateNotFoundException extends NotificationException {
  constructor(templateKey: string) {
    super(`Template not found: ${templateKey}`, 'TEMPLATE_NOT_FOUND', 404, {
      templateKey,
    });
  }
}

export class InvalidRecipientException extends NotificationException {
  constructor(recipient: string, type: string) {
    super(`Invalid ${type}: ${recipient}`, 'INVALID_RECIPIENT', 400, {
      recipient,
      type,
    });
  }
}

export class UserOptedOutException extends NotificationException {
  constructor(userId: string) {
    super(`User ${userId} has opted out of notifications`, 'USER_OPTED_OUT', 403, {
      userId,
    });
  }
}

export class RateLimitException extends NotificationException {
  constructor(limit: number, window: number) {
    super(
      `Rate limit exceeded. Limit: ${limit} per ${window} seconds`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { limit, window },
    );
  }
}
