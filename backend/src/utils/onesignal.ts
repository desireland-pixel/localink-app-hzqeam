import type { App } from '../index.js';

const ONESIGNAL_ENDPOINT = 'https://onesignal.com/api/v1/notifications';
const ONESIGNAL_APP_ID = 'b8e6b443-0155-4da8-8119-dce696e20d30';

interface SendPushData {
  [key: string]: any;
}

export async function sendPushNotification(
  app: App,
  playerIds: string[],
  title: string,
  message: string,
  data?: SendPushData
): Promise<void> {
  if (!playerIds || playerIds.length === 0) {
    return;
  }

  try {
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
    if (!restApiKey) {
      app.logger.warn('ONESIGNAL_REST_API_KEY not configured, skipping push notification');
      return;
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: message },
      small_icon: 'notification_icon',
      data: data || {},
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
        { status: response.status, errors: errorData, playerIds },
        'Failed to send OneSignal push notification'
      );
    } else {
      app.logger.info({ playerIds: playerIds.length, title }, 'Push notification sent successfully');
    }
  } catch (error) {
    app.logger.error(
      { err: error, playerIds },
      'Error sending OneSignal push notification'
    );
  }
}

export async function sendPushToAllUsers(
  app: App,
  title: string,
  message: string,
  data?: SendPushData
): Promise<void> {
  try {
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
    if (!restApiKey) {
      app.logger.warn('ONESIGNAL_REST_API_KEY not configured, skipping push notification');
      return;
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ['All'],
      headings: { en: title },
      contents: { en: message },
      small_icon: 'notification_icon',
      data: data || {},
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
    } else {
      app.logger.info({ title }, 'Push notification sent to all users successfully');
    }
  } catch (error) {
    app.logger.error(
      { err: error },
      'Error sending OneSignal push notification to all users'
    );
  }
}
