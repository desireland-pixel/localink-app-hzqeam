import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import * as schema from '../db/schema.js';

interface PostOutcomeBody {
  postId: string;
  postType: string;
  outcome: string;
  comment?: string;
}

const VALID_POST_TYPES = ['sublet', 'travel', 'community'];
const VALID_OUTCOMES = ['yes', 'no'];
const MAX_COMMENT_LENGTH = 300;

export function registerPostOutcomesRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Submit post outcome
  app.fastify.post('/api/posts/outcome', {
    schema: {
      description: 'Submit post outcome (yes/no feedback)',
      tags: ['posts'],
      body: {
        type: 'object',
        required: ['postId', 'postType', 'outcome'],
        properties: {
          postId: { type: 'string' },
          postType: { type: 'string', enum: ['sublet', 'travel', 'community'] },
          outcome: { type: 'string', enum: ['yes', 'no'] },
          comment: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        500: {
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

    const body = request.body as PostOutcomeBody;
    app.logger.info(
      { userId: session.user.id, postId: body.postId, postType: body.postType, outcome: body.outcome },
      'Submitting post outcome'
    );

    try {
      // Validate postId is a non-empty string
      if (!body.postId || typeof body.postId !== 'string' || body.postId.trim().length === 0) {
        app.logger.warn({ userId: session.user.id }, 'Missing or invalid postId');
        return reply.status(400).send({ error: 'postId is required and must be a non-empty string' });
      }

      // Validate postType
      if (!body.postType || !VALID_POST_TYPES.includes(body.postType)) {
        app.logger.warn({ userId: session.user.id, postType: body.postType }, 'Invalid postType');
        return reply.status(400).send({ error: 'postType must be one of: sublet, travel, community' });
      }

      // Validate outcome
      if (!body.outcome || !VALID_OUTCOMES.includes(body.outcome)) {
        app.logger.warn({ userId: session.user.id, outcome: body.outcome }, 'Invalid outcome');
        return reply.status(400).send({ error: 'outcome must be one of: yes, no' });
      }

      // Validate comment if present
      if (body.comment !== undefined && body.comment !== null) {
        if (typeof body.comment !== 'string' || body.comment.length > MAX_COMMENT_LENGTH) {
          app.logger.warn(
            { userId: session.user.id, commentLength: body.comment?.length },
            'Comment exceeds max length'
          );
          return reply.status(400).send({ error: `comment must be at most ${MAX_COMMENT_LENGTH} characters` });
        }
      }

      // Insert post outcome
      await app.db
        .insert(schema.postOutcomes)
        .values({
          userId: session.user.id,
          postId: body.postId,
          postType: body.postType,
          outcome: body.outcome,
          comment: body.comment || null,
        });

      app.logger.info(
        { userId: session.user.id, postId: body.postId, postType: body.postType, outcome: body.outcome },
        'Post outcome submitted successfully'
      );

      return { success: true };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id, postId: body.postId },
        'Failed to submit post outcome'
      );
      return reply.status(500).send({ error: 'Failed to submit post outcome' });
    }
  });
}
