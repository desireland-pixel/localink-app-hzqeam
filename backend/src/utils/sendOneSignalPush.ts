import type { App } from '../index.js';

export async function sendOneSignalPush(
  app: App,
  externalUserId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  // Check if OneSignal credentials are set
  const appId = process.env.ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey) {
    app.logger.warn(
      { externalUserId, title },
      'OneSignal push not sent - ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY not set'
    );
    return;
  }

  try {
    const payload = {
      include_aliases: {
        external_id: [externalUserId],
      },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: body },
      ...(data && { data }),
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      app.logger.warn(
        { externalUserId, status: response.status, error: errorText },
        'OneSignal push notification failed'
      );
      return;
    }

    app.logger.info(
      { externalUserId, title },
      'OneSignal push notification sent successfully'
    );
  } catch (error) {
    app.logger.error(
      { err: error, externalUserId, title },
      'Error sending OneSignal push notification'
    );
  }
}
