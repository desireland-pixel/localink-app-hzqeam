import { createApplication, resend } from "@specific-dev/framework";
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
import { startCleanupJob } from './utils/cleanup-job.js';

const schema = { ...appSchema, ...authSchema };

export const app = await createApplication(schema);
export type App = typeof app;

// Configure storage for file uploads
app.withStorage();

// Configure Better Auth with email and password support
// Note: Email verification is handled by custom OTP system to prevent duplicate emails
app.withAuth({
  emailAndPassword: {
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      resend.emails.send({
        from: 'LokaLinc <noreply@localink.app>',
        to: user.email,
        subject: 'LokaLinc - Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset Your Password</h2>
            <p>Click the link below to reset your password:</p>
            <div style="margin: 30px 0;">
              <a href="${url}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #6B7280; margin-top: 20px;">Or copy and paste this link into your browser:</p>
            <p style="color: #4F46E5; word-break: break-all;">${url}</p>
            <p style="color: #6B7280;">If you didn't request a password reset, please ignore this email.</p>
          </div>
        `,
      });
    },
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

// Start cleanup job for soft-deleted posts
startCleanupJob(app);

await app.run();
app.logger.info('LokaLinc API running');
