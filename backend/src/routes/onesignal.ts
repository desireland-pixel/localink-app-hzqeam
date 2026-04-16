import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';
import { sendPushNotification, sendPushToAllUsers } from '../utils/onesignal.js';
import { resend } from '@specific-dev/framework';

interface RegisterPlayerIdBody {
  playerId: string;
}

interface SendPushNotificationBody {
  title: string;
  message: string;
  userIds?: string[];
}

interface SendEmailBody {
  subject: string;
  body: string;
  userIds?: string[];
}

export function registerOnesignalRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Send push notification to specific users (admin only)
  app.fastify.post('/api/admin/notifications/push', {
    schema: {
      description: 'Send push notification to users (admin only)',
      tags: ['admin', 'notifications'],
      body: {
        type: 'object',
        required: ['title', 'message'],
        properties: {
          title: { type: 'string' },
          message: { type: 'string' },
          userIds: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            sent: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { title, message, userIds } = request.body as SendPushNotificationBody;
    app.logger.info({ userId: session.user.id, title, hasUserIds: !!userIds }, 'Sending push notification');

    try {
      // Check if user is admin
      const currentUser = await app.db.query.user.findFirst({
        where: eq(user.id, session.user.id),
      });

      if (!currentUser || !currentUser.isAdmin) {
        app.logger.warn({ userId: session.user.id }, 'Unauthorized push notification attempt');
        return reply.status(403).send({ error: 'You do not have permission to send push notifications' });
      }

      if (userIds && userIds.length > 0) {
        // Send to specific users
        await sendPushNotification(app, userIds, title, message);
        app.logger.info({ userId: session.user.id, title, sent: userIds.length }, 'Push notification sent successfully');
        return { success: true, sent: userIds.length };
      } else {
        // Send to all users
        await sendPushToAllUsers(app, title, message);
        app.logger.info({ userId: session.user.id, title }, 'Push notification sent to all users successfully');
        return { success: true, sent: -1 };
      }
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to send push notification');
      return reply.status(500).send({ error: 'Failed to send push notification' });
    }
  });

  // Send email to specific users (admin only)
  app.fastify.post('/api/admin/notifications/email', {
    schema: {
      description: 'Send email notification to users (admin only)',
      tags: ['admin', 'notifications'],
      body: {
        type: 'object',
        required: ['subject', 'body'],
        properties: {
          subject: { type: 'string' },
          body: { type: 'string' },
          userIds: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            sent: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { subject, body, userIds } = request.body as SendEmailBody;
    app.logger.info({ userId: session.user.id, subject, hasUserIds: !!userIds }, 'Sending email notification');

    try {
      // Check if user is admin
      const currentUser = await app.db.query.user.findFirst({
        where: eq(user.id, session.user.id),
      });

      if (!currentUser || !currentUser.isAdmin) {
        app.logger.warn({ userId: session.user.id }, 'Unauthorized email notification attempt');
        return reply.status(403).send({ error: 'You do not have permission to send emails' });
      }

      let users = [];

      if (userIds && userIds.length > 0) {
        users = await app.db.query.user.findMany({
          where: inArray(user.id, userIds),
        });
      } else {
        users = await app.db.query.user.findMany();
      }

      let sent = 0;

      for (const targetUser of users) {
        try {
          resend.emails.send({
            from: 'LokaLinc <noreply@lokalinc.de>',
            to: targetUser.email,
            subject: subject,
            html: body,
          });
          sent++;
        } catch (error) {
          app.logger.error(
            { err: error, userId: targetUser.id, email: targetUser.email },
            'Failed to send email to user'
          );
        }
      }

      app.logger.info({ userId: session.user.id, subject, sent }, 'Email notifications sent successfully');
      return { success: true, sent };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to send emails');
      return reply.status(500).send({ error: 'Failed to send emails' });
    }
  });
}
