import { createApplication, resend } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerProfileRoutes } from './routes/profile.js';
import { registerCityRoutes } from './routes/cities.js';
import { registerSubletRoutes } from './routes/sublets.js';
import { registerTravelPostRoutes } from './routes/travel-posts.js';
import { registerCarryPostRoutes } from './routes/carry-posts.js';
import { registerConversationRoutes } from './routes/conversations.js';
import { registerWebSocketRoutes } from './routes/websocket.js';

const schema = { ...appSchema, ...authSchema };

export const app = await createApplication(schema);
export type App = typeof app;

// Configure Better Auth with email verification and social providers
app.withAuth({
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      resend.emails.send({
        from: 'Localink <noreply@localink.app>',
        to: user.email,
        subject: 'Localink - Verify Your Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Localink!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <div style="margin: 30px 0;">
              <a href="${url}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email
              </a>
            </div>
            <p style="color: #6B7280; margin-top: 20px;">Or copy and paste this link into your browser:</p>
            <p style="color: #4F46E5; word-break: break-all;">${url}</p>
            <p style="color: #6B7280;">If you didn't create an account with Localink, please ignore this email.</p>
          </div>
        `,
      });
    },
  },
  emailAndPassword: {
    sendResetPassword: async ({ user, url }) => {
      resend.emails.send({
        from: 'Localink <noreply@localink.app>',
        to: user.email,
        subject: 'Localink - Reset Your Password',
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
registerProfileRoutes(app);
registerCityRoutes(app);
registerSubletRoutes(app);
registerTravelPostRoutes(app);
registerCarryPostRoutes(app);
registerConversationRoutes(app);
registerWebSocketRoutes(app);

await app.run();
app.logger.info('Localink API running');
