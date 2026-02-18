import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

interface PushTokenBody {
  token: string;
  platform: 'ios' | 'android';
}

export function registerPushTokenRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Register push token
  app.fastify.post('/api/push-tokens', {
    schema: {
      description: 'Register device push token for authenticated user',
      tags: ['push-tokens'],
      body: {
        type: 'object',
        required: ['token', 'platform'],
        properties: {
          token: { type: 'string' },
          platform: { type: 'string', enum: ['ios', 'android'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { token, platform } = request.body as PushTokenBody;
    app.logger.info({ userId: session.user.id, token: token.substring(0, 20) + '...', platform }, 'Registering push token');

    try {
      // Check if token already exists for this user
      const existingToken = await app.db.query.pushTokens.findFirst({
        where: eq(schema.pushTokens.token, token),
      });

      if (!existingToken) {
        // Insert new token
        await app.db
          .insert(schema.pushTokens)
          .values({
            userId: session.user.id,
            token,
            platform,
          });
        app.logger.info({ userId: session.user.id }, 'Push token registered successfully');
      } else {
        app.logger.info({ userId: session.user.id }, 'Push token already registered');
      }

      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to register push token');
      return reply.status(500).send({ error: 'Failed to register push token' });
    }
  });

  // Delete push token
  app.fastify.delete('/api/push-tokens/:token', {
    schema: {
      description: 'Remove push token',
      tags: ['push-tokens'],
      params: {
        type: 'object',
        properties: {
          token: { type: 'string' },
        },
        required: ['token'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { token } = request.params as { token: string };
    app.logger.info({ userId: session.user.id, token: token.substring(0, 20) + '...' }, 'Deleting push token');

    try {
      // Delete the token (only if it belongs to the user)
      await app.db
        .delete(schema.pushTokens)
        .where(eq(schema.pushTokens.token, token));

      app.logger.info({ userId: session.user.id }, 'Push token deleted successfully');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to delete push token');
      return reply.status(500).send({ error: 'Failed to delete push token' });
    }
  });
}
