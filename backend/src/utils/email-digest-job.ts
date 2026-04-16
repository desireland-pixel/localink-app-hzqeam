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
    true, // Start the job right away
    'UTC'
  );

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

  // Build HTML email
  const html = buildDigestHtml(notifications, user.name || 'User');

  // Send email
  await resend.emails.send({
    from: 'LokaLinc <noreply@lokalinc.de>',
    to: user.email,
    subject: `LokaLinc: You have ${notifications.length} new match${notifications.length > 1 ? 'es' : ''}!`,
    html,
  });

  // Mark all notifications as emailed
  const notificationIds = notifications.map(n => n.id);
  await app.db
    .update(schema.matchNotifications)
    .set({
      emailSent: true,
      emailSentAt: new Date(),
    })
    .where(and(
      eq(schema.matchNotifications.notifiedUserId, userId),
      eq(schema.matchNotifications.emailSent, false)
    ));

  app.logger.info({ userId, notificationCount: notifications.length }, 'Digest email sent');
}

function buildDigestHtml(notifications: any[], userName: string): string {
  const matchItems = notifications
    .map(notification => {
      let matchDescription = '';
      if (notification.matchedPostType === 'sublet') {
        matchDescription = 'A sublet listing';
      } else if (notification.matchedPostType === 'travel') {
        matchDescription = 'A travel post';
      }

      return `
        <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid #10B981; background-color: #F0FDF4;">
          <p style="margin: 5px 0; font-weight: bold; color: #1F2937;">New Match: ${matchDescription}</p>
          <p style="margin: 5px 0; color: #4B5563; font-size: 14px;">
            Your ${notification.postType} post has a potential match!
          </p>
          <p style="margin: 10px 0;">
            <a href="https://8ktzqvc7jybkjvj4cr9gwmp8qp4v5q3y.app.specular.dev/matches"
               style="background-color: #10B981; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Match
            </a>
          </p>
        </div>
      `;
    })
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FFFFFF; padding: 20px;">
      <h2 style="color: #1F2937; margin-bottom: 10px;">Hello ${userName}! 🎉</h2>
      <p style="color: #4B5563; margin-bottom: 20px;">
        Great news! You have ${notifications.length} new match${notifications.length > 1 ? 'es' : ''} on LokaLinc!
      </p>

      <div style="background-color: #F9FAFB; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        ${matchItems}
      </div>

      <p style="color: #4B5563; margin-bottom: 10px;">
        Visit your matches page to connect with these potential partners.
      </p>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 12px;">
        <p>LokaLinc Team — Find Your Perfect Match!</p>
        <p>
          <a href="https://8ktzqvc7jybkjvj4cr9gwmp8qp4v5q3y.app.specular.dev/" style="color: #10B981; text-decoration: none;">
            Visit LokaLinc
          </a>
        </p>
      </div>
    </div>
  `;
}
