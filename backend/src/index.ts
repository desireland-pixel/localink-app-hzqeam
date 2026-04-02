import { createApplication, resend, createAuthMiddleware } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerProfileRoutes } from './routes/profile.js';
import { registerCityRoutes } from './routes/cities.js';
import { registerSubletRoutes } from './routes/sublets.js';
import { registerTravelPostRoutes } from './routes/travel-posts.js';
import { registerConversationRoutes } from './routes/conversations.js';
import { registerWebSocketRoutes } from './routes/websocket.js';
import { registerFavoriteRoutes } from './routes/favorites.js';
import { registerUploadRoutes } from './routes/upload.js';
import { registerShareRoutes } from './routes/share.js';
import { registerCommunityRoutes } from './routes/community.js';
import { registerPushTokenRoutes } from './routes/push-tokens.js';
import { registerOnesignalRoutes } from './routes/onesignal.js';
import { registerNotificationPreferencesRoutes } from './routes/notification-preferences.js';
import { startCleanupJob } from './utils/cleanup-job.js';

const schema = { ...appSchema, ...authSchema };

export const app = await createApplication(schema);
export type App = typeof app;

// Configure storage for file uploads
app.withStorage();

// Store client platform info to determine reset URL format
let lastClientPlatform: string | undefined;
let lastUserAgent: string = '';

// Create before hook to capture client platform info for password reset
const beforeAuthHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path === "/request-password-reset") {
    lastClientPlatform = ctx.request?.headers?.['x-client-platform'] as string | undefined;
    lastUserAgent = (ctx.request?.headers?.['user-agent'] as string) || '';
    app.logger.info({ clientPlatform: lastClientPlatform, userAgent: lastUserAgent }, 'Password reset requested');
  }
});

// Create after hook for password reset success email and sign-up default preferences
const afterAuthHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path === "/reset-password") {
    const user = ctx.context.newSession?.user;
    if (user) {
      // Send password reset success email (fire and forget)
      resend.emails.send({
        from: 'LokaLinc <noreply@lokalinc.de>',
        to: user.email,
        subject: 'Your LokaLinc password has been updated',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Changed Successfully</h2>
            <p>Hi ${user.name},</p>
            <p>Your LokaLinc password has been updated successfully.</p>
            <p>If you didn't make this change, please contact our support team immediately.</p>
            <p>— The LokaLinc Team</p>
          </div>
        `,
      });
      app.logger.info({ userId: user.id }, 'Password reset success email sent');
    }
  } else if (ctx.path === "/sign-up/email") {
    const user = ctx.context.newSession?.user;
    if (user) {
      // Create default notification preferences for new user (INSERT ... ON CONFLICT DO NOTHING)
      try {
        await app.db.insert(appSchema.userNotificationPreferences).values({
          userId: user.id,
          notifyEmail: true,
          notifyPush: true,
          notifyMessages: true,
          notifyPosts: true,
        }).onConflictDoNothing();
        app.logger.info({ userId: user.id }, 'Default notification preferences created for new user');
      } catch (error) {
        app.logger.warn({ err: error, userId: user.id }, 'Failed to create default notification preferences');
      }
    }
  }
});

// Configure Better Auth with email and password support
// Note: Email verification is handled by custom OTP system to prevent duplicate emails
app.withAuth({
  emailAndPassword: {
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // Determine if request is from native client
      const isNative = lastClientPlatform === 'native' ||
                      /Expo|okhttp|CFNetwork/i.test(lastUserAgent);

      // Extract token from URL
      const urlObj = new URL(url);
      const resetToken = urlObj.searchParams.get('token') || '';

      // Build reset URL based on client type
      const resetUrl = isNative
        ? `localink://reset-password?token=${resetToken}`
        : `https://8ktzqvc7jybkjvj4cr9gwmp8qp4v5q3y.app.specular.dev/reset-password?token=${resetToken}`;

      app.logger.info({ userId: user.id, isNative, resetUrl }, 'Sending password reset email');

      resend.emails.send({
        from: 'LokaLinc <noreply@lokalinc.de>',
        to: user.email,
        subject: 'Reset your LokaLinc password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset Your LokaLinc Password</h2>
            <p>Click the link below to reset your LokaLinc password. This link expires in 1 hour.</p>
            <div style="margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #6B7280; margin-top: 20px;">Or copy and paste this link into your browser:</p>
            <p style="color: #4F46E5; word-break: break-all;">${resetUrl}</p>
            <p style="color: #6B7280;">If you didn't request a password reset, please ignore this email.</p>
          </div>
        `,
      });
    },
  },
  hooks: {
    before: beforeAuthHook,
    after: afterAuthHook,
  },
});

// Register all route modules
registerAuthRoutes(app);
registerProfileRoutes(app);
registerCityRoutes(app);
registerSubletRoutes(app);
registerTravelPostRoutes(app);
registerConversationRoutes(app);
registerWebSocketRoutes(app);
registerFavoriteRoutes(app);
registerUploadRoutes(app);
registerShareRoutes(app);
registerCommunityRoutes(app);
registerPushTokenRoutes(app);
registerOnesignalRoutes(app);
registerNotificationPreferencesRoutes(app);

// Start cleanup job for soft-deleted posts
startCleanupJob(app);

await app.run();
app.logger.info('LokaLinc API running');
