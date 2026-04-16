import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { runMatchingForPost } from '../utils/matching.js';

export function registerMatchRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/matches - Get user's match notifications
  app.fastify.get('/api/matches', {
    schema: {
      description: 'Get current user\'s match notifications',
      tags: ['matches'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              postId: { type: 'string' },
              postType: { type: 'string' },
              matchedPostId: { type: 'string' },
              matchedPostType: { type: 'string' },
              pushSent: { type: 'boolean' },
              pushSentAt: { type: 'string' },
              emailSent: { type: 'boolean' },
              emailSentAt: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const limit = parseInt((request.query as any).limit || '50');
    const offset = parseInt((request.query as any).offset || '0');

    app.logger.info({ userId: session.user.id, limit, offset }, 'Fetching user matches');

    try {
      const matches = await app.db
        .select()
        .from(schema.matchNotifications)
        .where(eq(schema.matchNotifications.notifiedUserId, session.user.id))
        .limit(limit)
        .offset(offset)
        .orderBy(schema.matchNotifications.createdAt);

      app.logger.info({ userId: session.user.id, count: matches.length }, 'User matches fetched successfully');
      return matches;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch user matches');
      return reply.status(500).send({ error: 'Failed to fetch matches' });
    }
  });

  // POST /api/matches/trigger - Manually trigger matching (internal use)
  app.fastify.post('/api/matches/trigger', {
    schema: {
      description: 'Manually trigger matching for a post (internal use)',
      tags: ['matches'],
      body: {
        type: 'object',
        required: ['postId', 'postType'],
        properties: {
          postId: { type: 'string', format: 'uuid' },
          postType: { type: 'string', enum: ['sublet', 'travel'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { postId: string; postType: 'sublet' | 'travel' };

    app.logger.info({ postId: body.postId, postType: body.postType }, 'Manual matching triggered');

    try {
      await runMatchingForPost(app, body.postId, body.postType);

      app.logger.info({ postId: body.postId, postType: body.postType }, 'Matching completed successfully');
      return { success: true, message: 'Matching triggered successfully' };
    } catch (error) {
      app.logger.error({ err: error, postId: body.postId, postType: body.postType }, 'Failed to trigger matching');
      return reply.status(500).send({ error: 'Failed to trigger matching' });
    }
  });
}
