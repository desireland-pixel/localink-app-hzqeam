import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

interface ShareParams {
  postType: 'sublet' | 'travel' | 'community';
  id: string;
}

export function registerShareRoutes(app: App) {
  app.fastify.get('/api/posts/:postType/:id/share', {
    schema: {
      description: 'Get share information for a post',
      tags: ['share'],
      params: {
        type: 'object',
        properties: {
          postType: { type: 'string', enum: ['sublet', 'travel', 'community'] },
          id: { type: 'string', format: 'uuid' },
        },
        required: ['postType', 'id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            shareUrl: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { postType, id } = request.params as ShareParams;
    app.logger.info({ postType, postId: id }, 'Fetching share info');

    try {
      let title = '';
      let description = '';

      if (postType === 'sublet') {
        const sublet = await app.db.query.sublets.findFirst({
          where: eq(schema.sublets.id, id),
        });

        if (!sublet) {
          app.logger.warn({ postType, postId: id }, 'Post not found');
          return reply.status(404).send({ error: 'Post not found' });
        }

        title = sublet.title;
        description = sublet.description || `Sublet in ${sublet.city}`;
        
      } else if (postType === 'travel') {
        const post = await app.db.query.travelPosts.findFirst({
          where: eq(schema.travelPosts.id, id),
        });

        if (!post) {
          app.logger.warn({ postType, postId: id }, 'Post not found');
          return reply.status(404).send({ error: 'Post not found' });
        }

        title = `Travel ${post.type} - ${post.fromCity} to ${post.toCity}`;
        description = post.description || `Travel companion ${post.type}`;
        
      } else if (postType === 'community') {

        const topic = await app.db.query.discussionTopics.findFirst({
          where: eq(schema.discussionTopics.id, id),
        });
      
        if (!topic) {
          app.logger.warn({ postType, postId: id }, 'Post not found');
          return reply.status(404).send({ error: 'Post not found' });
        }
      
        title = topic.title;
        description = topic.description || `Community discussion`;
      
      }

      // Construct share URL (would be frontend URL in production)
      const baseUrl = process.env.APP_URL || 'https://localink.app';
      const shareUrl = `${baseUrl}/${postType}/${id}`;

      app.logger.info({ postType, postId: id, shareUrl }, 'Share info retrieved successfully');
      return {
        shareUrl,
        title,
        description,
      };
    } catch (error) {
      app.logger.error({ err: error, postType, postId: id }, 'Failed to get share info');
      return reply.status(500).send({ error: 'Failed to get share info' });
    }
  });
}
