import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

interface NotificationPreferencesBody {
  notifyEmail?: boolean;
  notifyPush?: boolean;
  notifyMessages?: boolean;
  notifyPosts?: boolean;
}

export function registerNotificationPreferencesRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET notification preferences
  app.fastify.get('/api/notification-preferences', {
    schema: {
      description: 'Get current user notification preferences',
      tags: ['notifications'],
      response: {
        200: {
          type: 'object',
          properties: {
            notifyEmail: { type: 'boolean' },
            notifyPush: { type: 'boolean' },
            notifyMessages: { type: 'boolean' },
            notifyPosts: { type: 'boolean' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching notification preferences');

    try {
      let preferences = await app.db.query.userNotificationPreferences.findFirst({
        where: eq(schema.userNotificationPreferences.userId, session.user.id),
      });

      // If no preferences exist, create defaults
      if (!preferences) {
        app.logger.info({ userId: session.user.id }, 'Creating default notification preferences');
        await app.db.insert(schema.userNotificationPreferences).values({
          userId: session.user.id,
          notifyEmail: true,
          notifyPush: true,
          notifyMessages: true,
          notifyPosts: true,
        });

        preferences = await app.db.query.userNotificationPreferences.findFirst({
          where: eq(schema.userNotificationPreferences.userId, session.user.id),
        });
      }

      app.logger.info({ userId: session.user.id }, 'Notification preferences fetched successfully');
      return {
        notifyEmail: preferences?.notifyEmail ?? true,
        notifyPush: preferences?.notifyPush ?? true,
        notifyMessages: preferences?.notifyMessages ?? true,
        notifyPosts: preferences?.notifyPosts ?? true,
      };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch notification preferences');
      return reply.status(500).send({ error: 'Failed to fetch notification preferences' });
    }
  });

  // PATCH notification preferences
  app.fastify.patch('/api/notification-preferences', {
    schema: {
      description: 'Update notification preferences (partial update)',
      tags: ['notifications'],
      body: {
        type: 'object',
        properties: {
          notifyEmail: { type: 'boolean' },
          notifyPush: { type: 'boolean' },
          notifyMessages: { type: 'boolean' },
          notifyPosts: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            notifyEmail: { type: 'boolean' },
            notifyPush: { type: 'boolean' },
            notifyMessages: { type: 'boolean' },
            notifyPosts: { type: 'boolean' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const body = request.body as NotificationPreferencesBody;

    app.logger.info({ userId: session.user.id, body }, 'Updating notification preferences');

    try {
      const updateValues: Record<string, any> = { updatedAt: new Date() };

      if (body.notifyEmail !== undefined) updateValues.notifyEmail = body.notifyEmail;
      if (body.notifyPush !== undefined) updateValues.notifyPush = body.notifyPush;
      if (body.notifyMessages !== undefined) updateValues.notifyMessages = body.notifyMessages;
      if (body.notifyPosts !== undefined) updateValues.notifyPosts = body.notifyPosts;

      // UPSERT: insert if not exists, update if exists
      const existing = await app.db.query.userNotificationPreferences.findFirst({
        where: eq(schema.userNotificationPreferences.userId, session.user.id),
      });

      if (existing) {
        await app.db
          .update(schema.userNotificationPreferences)
          .set(updateValues)
          .where(eq(schema.userNotificationPreferences.userId, session.user.id));
      } else {
        await app.db.insert(schema.userNotificationPreferences).values({
          userId: session.user.id,
          notifyEmail: body.notifyEmail ?? true,
          notifyPush: body.notifyPush ?? true,
          notifyMessages: body.notifyMessages ?? true,
          notifyPosts: body.notifyPosts ?? true,
        });
      }

      const updated = await app.db.query.userNotificationPreferences.findFirst({
        where: eq(schema.userNotificationPreferences.userId, session.user.id),
      });

      app.logger.info({ userId: session.user.id }, 'Notification preferences updated successfully');
      return {
        notifyEmail: updated?.notifyEmail ?? true,
        notifyPush: updated?.notifyPush ?? true,
        notifyMessages: updated?.notifyMessages ?? true,
        notifyPosts: updated?.notifyPosts ?? true,
      };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to update notification preferences');
      return reply.status(500).send({ error: 'Failed to update notification preferences' });
    }
  });
}
