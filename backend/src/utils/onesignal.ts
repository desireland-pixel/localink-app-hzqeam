import type { App } from '../index.js';

const ONESIGNAL_ENDPOINT = 'https://onesignal.com/api/v1/notifications';

interface SendPushData {
  [key: string]: any;
}

/**
 * Send push notification to specific users using external_id
 * @returns true if successful, false otherwise
 */
export async function sendPushNotification(
  app: App,
  userIds: string[],
  title: string,
  message: string,
  data?: SendPushData
): Promise<boolean> {
  if (!userIds || userIds.length === 0) {
    return false;
  }

  const appId = process.env.ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey) {
    app.logger.warn(
      { userIds },
      'ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY not configured, skipping push notification'
    );
    return false;
  }

  try {
    const payload = {
      app_id: appId,
      include_aliases: {
        external_id: userIds,
      },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: message },
      ...(data && { data }),
    };

    const response = await fetch(ONESIGNAL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${restApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json() as Record<string, any>;
      app.logger.warn(
        { status: response.status, errors: errorData, userIds },
        'Failed to send OneSignal push notification'
      );
      return false;
    }

    app.logger.info(
      { userCount: userIds.length, title },
      'Push notification sent successfully'
    );
    return true;
  } catch (error) {
    app.logger.error(
      { err: error, userIds },
      'Error sending OneSignal push notification'
    );
    return false;
  }
}

/**
 * Broadcast push notification to all users
 * @returns true if successful, false otherwise
 */
export async function sendPushToAllUsers(
  app: App,
  title: string,
  message: string,
  data?: SendPushData
): Promise<boolean> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey) {
    app.logger.warn(
      {},
      'ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY not configured, skipping push notification'
    );
    return false;
  }

  try {
    const payload = {
      app_id: appId,
      included_segments: ['Total Subscriptions'],
      headings: { en: title },
      contents: { en: message },
      ...(data && { data }),
    };

    const response = await fetch(ONESIGNAL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${restApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json() as Record<string, any>;
      app.logger.warn(
        { status: response.status, errors: errorData },
        'Failed to send OneSignal push notification to all users'
      );
      return false;
    }

    app.logger.info({ title }, 'Push notification sent to all users successfully');
    return true;
  } catch (error) {
    app.logger.error(
      { err: error },
      'Error sending OneSignal push notification to all users'
    );
    return false;
  }
}
