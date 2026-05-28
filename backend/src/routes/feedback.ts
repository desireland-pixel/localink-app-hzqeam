import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import * as schema from '../db/schema.js';

interface FeedbackBody {
  category: string;
  message: string;
}

const VALID_CATEGORIES = ['general', 'bug', 'feature'];

export function registerFeedbackRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Submit feedback
  app.fastify.post('/api/feedback', {
    schema: {
      description: 'Submit user feedback',
      tags: ['feedback'],
      body: {
        type: 'object',
        required: ['category', 'message'],
        properties: {
          category: { type: 'string', enum: ['general', 'bug', 'feature'] },
          message: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
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

    const body = request.body as FeedbackBody;
    app.logger.info({ userId: session.user.id, category: body.category }, 'Submitting feedback');

    try {
      // Validate that required fields are present (schema should catch this, but validate to be safe)
      if (!body.category || !body.message) {
        app.logger.warn({ hasCat: !!body.category, hasMsg: !!body.message }, 'Missing required fields');
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      // Validate category
      if (!VALID_CATEGORIES.includes(body.category)) {
        app.logger.warn({ category: body.category }, 'Invalid feedback category');
        return reply.status(400).send({ error: 'Invalid category' });
      }

      // Validate and trim message
      const trimmedMessage = body.message.trim();
      if (trimmedMessage.length < 10 || trimmedMessage.length > 500) {
        app.logger.warn({ messageLength: trimmedMessage.length }, 'Message length out of range');
        return reply.status(400).send({ error: 'Message must be between 10 and 500 characters' });
      }

      // Insert feedback
      const [feedbackRecord] = await app.db
        .insert(schema.feedback)
        .values({
          userId: session.user.id,
          category: body.category,
          message: trimmedMessage,
        })
        .returning();

      app.logger.info({ userId: session.user.id, feedbackId: feedbackRecord.id }, 'Feedback submitted successfully');

      reply.status(201);
      return {
        id: feedbackRecord.id,
        created_at: feedbackRecord.createdAt.toISOString(),
      };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to submit feedback');
      return reply.status(500).send({ error: 'Failed to submit feedback' });
    }
  });
}
