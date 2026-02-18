import type { App } from '../index.js';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

interface PushNotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: {
    conversationId?: string;
    topicId?: string;
    [key: string]: any;
  };
}

export async function sendPushNotification(
  app: App,
  payload: PushNotificationPayload,
  userIdToNotify: string
): Promise<void> {
  try {
    // Get all push tokens for the user
    const pushTokens = await app.db.query.pushTokens.findMany({
      where: eq(schema.pushTokens.userId, userIdToNotify),
    });

    if (pushTokens.length === 0) {
      app.logger.debug({ userId: userIdToNotify }, 'No push tokens found for user');
      return;
    }

    // Send notification to each token
    for (const pushToken of pushTokens) {
      try {
        const tokenStr = String(pushToken.token);
        const response = await fetch(EXPO_PUSH_ENDPOINT, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: tokenStr,
            title: payload.title,
            body: payload.body,
            data: payload.data || {},
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          app.logger.warn({ token: tokenStr.substring(0, 20) + '...', error }, 'Failed to send push notification');
        } else {
          app.logger.debug({ token: tokenStr.substring(0, 20) + '...' }, 'Push notification sent successfully');
        }
      } catch (error) {
        app.logger.error({ err: error, token: String(pushToken.token).substring(0, 20) + '...' }, 'Error sending push notification');
      }
    }
  } catch (error) {
    app.logger.error({ err: error, userId: userIdToNotify }, 'Failed to send push notification');
  }
}
