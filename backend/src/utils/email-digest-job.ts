import { CronJob } from 'cron';
import type { App } from '../index.js';
import { eq, and, isNull } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { resend } from '@specific-dev/framework';

export function startEmailDigestJob(app: App) {
  // Run at 9 AM UTC on Monday (0) and Thursday (4)
  const job = new CronJob(
    '0 9 * * 0,4', // 9 AM UTC on Monday and Thursday
    async () => {
      app.logger.info({}, 'Starting email digest job');
      try {
        await sendEmailDigests(app);
      } catch (error) {
        app.logger.error({ err: error }, 'Email digest job failed');
      }
    },
    null,
    false, // Start the job right away
    'UTC'
  );

  job.start();

  app.logger.info({}, 'Email digest cron job started (Monday & Thursday at 9 AM UTC)');
}

async function sendEmailDigests(app: App) {
  // Get all unique users with unsent email notifications
  const unsent = await app.db
    .select({
      notifiedUserId: schema.matchNotifications.notifiedUserId,
    })
    .from(schema.matchNotifications)
    .where(and(
      eq(schema.matchNotifications.emailSent, false),
      isNull(schema.matchNotifications.emailSentAt)
    ));

  const uniqueUserIds = [...new Set(unsent.map(n => n.notifiedUserId))];

  app.logger.info({ count: uniqueUserIds.length }, 'Processing email digests for users');

  for (const userId of uniqueUserIds) {
    try {
      await sendDigestForUser(app, userId);
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to send digest for user');
    }
  }

  app.logger.info({ processedUsers: uniqueUserIds.length }, 'Email digest job completed');
}

async function sendDigestForUser(app: App, userId: string) {
  // Get all unsent notifications for this user
  const notifications = await app.db
    .select()
    .from(schema.matchNotifications)
    .where(and(
      eq(schema.matchNotifications.notifiedUserId, userId),
      eq(schema.matchNotifications.emailSent, false),
      isNull(schema.matchNotifications.emailSentAt)
    ));

  if (notifications.length === 0) return;

  // Get user email
  const user = await app.db.query.user.findFirst({
    where: (user) => eq(user.id, userId),
  });

  if (!user) {
    app.logger.warn({ userId }, 'User not found for digest');
    return;
  }

  // Check notification preferences — skip if user has opted out of email
  const prefs = await app.db.query.userNotificationPreferences.findFirst({
    where: (p) => eq(p.userId, userId),
  });
  if (prefs && prefs.notifyEmail === false) {
    app.logger.info({ userId }, 'User opted out of email notifications, skipping digest');
    return;
  }

  const totalCount = notifications.length;

  // Cap at 5 notifications for the email body
  const capped = notifications.slice(0, 5);

  // Enrich each notification with title and deep link
  const enrichedNotifications: Array<{ title: string; deepLink: string; matchedPostType: string }> = [];

  for (const notification of capped) {
    let title = 'Post no longer available';
    let deepLink = '';

    if (notification.matchedPostType === 'sublet') {
      deepLink = `https://lokalinc.de/sublet/${notification.matchedPostId}`;
      const sublet = await app.db.query.sublets.findFirst({
        where: (s) => eq(s.id, notification.matchedPostId),
      });
      if (sublet) {
        title = sublet.title;
      }
    } else if (notification.matchedPostType === 'travel') {
      deepLink = `https://lokalinc.de/travel/${notification.matchedPostId}`;
      const travelPost = await app.db.query.travelPosts.findFirst({
        where: (t) => eq(t.id, notification.matchedPostId),
      });
      if (travelPost) {
        title = `${travelPost.fromCity} → ${travelPost.toCity}`;
      }
    }

    enrichedNotifications.push({ title, deepLink, matchedPostType: notification.matchedPostType });
  }

  // Build HTML email
  const html = buildDigestHtml(enrichedNotifications, user.name || 'User', totalCount);

  // Send email
  await resend.emails.send({
    from: 'LokaLinc <noreply@lokalinc.de>',
    to: user.email,
    subject: `Congratulations, You have ${totalCount} new match${totalCount > 1 ? 'es' : ''}!`,
    html,
  });

  // Mark all notifications as emailed
  await app.db
    .update(schema.matchNotifications)
    .set({
      emailSent: true,
      emailSentAt: new Date(),
    })
    .where(and(
      eq(schema.matchNotifications.notifiedUserId, userId),
      eq(schema.matchNotifications.emailSent, false),
      isNull(schema.matchNotifications.emailSentAt)
    ));

  app.logger.info({ userId, notificationCount: totalCount }, 'Digest email sent');
}

function buildDigestHtml(
  notifications: Array<{ title: string; deepLink: string; matchedPostType: string }>,
  userName: string,
  totalCount: number
): string {
  const matchItems = notifications
    .map(({ title, deepLink }) => `
      <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid #10B981; background-color: #F0FDF4;">
        <p style="margin: 5px 0; font-weight: bold; color: #1F2937;">${title}</p>
        <p style="margin: 5px 0; color: #4B5563; font-size: 14px;">Contact the post owner soon.</p>
        <p style="margin: 10px 0;">
          <a href="${deepLink}"
             style="background-color: #10B981; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Match
          </a>
        </p>
      </div>
    `)
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FFFFFF; padding: 20px;">

      <h2 style="color: #1F2937; margin-bottom: 10px;">Hello ${userName},</h2>
      <p style="color: #4B5563; margin-bottom: 20px;">
        Great news! Your post has ${totalCount} new match${totalCount > 1 ? 'es' : ''} on LokaLinc! 🎉
      </p>

      <div style="background-color: #F9FAFB; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        ${matchItems}
      </div>

      <p style="color: #4B5563; margin-bottom: 20px;">
        There could be more matches. Use the filters in the app to find more.
      </p>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 12px;">
        <p style="margin-bottom: 8px;">LokaLinc — Living and Moving Together</p>
        <p style="margin-bottom: 8px;">
          <a href="https://lokalinc.de" style="color: #10B981; text-decoration: none;">Visit Website</a>
        </p>
        <p>
          <a href="lokalinc://notifications" style="color: #9CA3AF; text-decoration: underline; font-size: 11px;">
            Don't want these emails? Unsubscribe here
          </a>
        </p>
      </div>

    </div>
  `;
}
