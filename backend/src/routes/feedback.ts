import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import * as schema from '../db/schema.js';

interface FeedbackBody {
  category: string;
  message: string;
}

const VALID_CATEGORIES = ['general', 'bug', 'feature'];

export function registerFeedbackRoutes(app: App) {
  // Submit feedback (unauthenticated)
  app.fastify.post('/api/feedback', {
    schema: {
      description: 'Submit user feedback (unauthenticated)',
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
            ok: { type: 'boolean' },
          },
        },
        400: {
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
    const body = request.body as FeedbackBody;
    app.logger.info({ category: body.category }, 'Submitting feedback');

    try {
      // Validate that required fields are present
      if (!body.category || !body.message) {
        app.logger.warn({ hasCat: !!body.category, hasMsg: !!body.message }, 'Missing required fields');
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      // Validate category
      if (!VALID_CATEGORIES.includes(body.category)) {
        app.logger.warn({ category: body.category }, 'Invalid feedback category');
        return reply.status(400).send({ error: 'Invalid category' });
      }

      // Try to get session (optional for this endpoint)
      let userId: string | null = null;
      try {
        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) {
            headers.append(key, Array.isArray(value) ? value[0] : value);
          }
        });
        const session = await app.auth.api.getSession({ headers });
        if (session) {
          userId = session.user.id;
        }
      } catch {
        // No valid session, userId remains null
      }

      // Insert feedback
      await app.db
        .insert(schema.feedback)
        .values({
          userId,
          category: body.category,
          message: body.message,
        });

      app.logger.info({ userId, category: body.category }, 'Feedback submitted successfully');

      reply.status(201);
      return { ok: true };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to submit feedback');
      return reply.status(500).send({ error: 'Failed to submit feedback' });
    }
  });
}
