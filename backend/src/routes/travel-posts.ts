import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lte } from 'drizzle-orm';
import * as schema from '../db/schema.js';

interface TravelPostFilters {
  fromCity?: string;
  toCity?: string;
  travelDate?: string;
  type?: 'looking_for_buddy' | 'offering_companionship';
  limit?: string;
  offset?: string;
}

interface TravelPostBody {
  title: string;
  description?: string;
  fromCity: string;
  toCity: string;
  travelDate: string;
  type: 'looking_for_buddy' | 'offering_companionship';
}

export function registerTravelPostRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // List travel posts with filters
  app.fastify.get('/api/travel-posts', {
    schema: {
      description: 'List travel posts with optional filters',
      tags: ['travel-posts'],
      querystring: {
        type: 'object',
        properties: {
          fromCity: { type: 'string' },
          toCity: { type: 'string' },
          travelDate: { type: 'string', format: 'date' },
          type: { type: 'string', enum: ['looking_for_buddy', 'offering_companionship'] },
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const filters = request.query as TravelPostFilters;
    app.logger.info({ filters }, 'Listing travel posts');

    try {
      const conditions: any[] = [eq(schema.travelPosts.status, 'active')];

      if (filters.fromCity) {
        conditions.push(eq(schema.travelPosts.fromCity, filters.fromCity));
      }

      if (filters.toCity) {
        conditions.push(eq(schema.travelPosts.toCity, filters.toCity));
      }

      if (filters.travelDate) {
        conditions.push(eq(schema.travelPosts.travelDate, filters.travelDate));
      }

      if (filters.type) {
        conditions.push(eq(schema.travelPosts.type, filters.type));
      }

      const limit = parseInt(filters.limit || '20');
      const offset = parseInt(filters.offset || '0');

      const posts = await app.db
        .select()
        .from(schema.travelPosts)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(schema.travelPosts.createdAt);

      app.logger.info({ count: posts.length }, 'Travel posts listed successfully');
      return posts;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to list travel posts');
      return reply.status(500).send({ error: 'Failed to list travel posts' });
    }
  });

  // Get travel post by ID
  app.fastify.get('/api/travel-posts/:id', {
    schema: {
      description: 'Get travel post details by ID',
      tags: ['travel-posts'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ travelPostId: id }, 'Fetching travel post details');

    try {
      const post = await app.db.query.travelPosts.findFirst({
        where: eq(schema.travelPosts.id, id),
      });

      if (!post) {
        app.logger.warn({ travelPostId: id }, 'Travel post not found');
        return reply.status(404).send({ error: 'Travel post not found' });
      }

      app.logger.info({ travelPostId: id }, 'Travel post details fetched successfully');
      return post;
    } catch (error) {
      app.logger.error({ err: error, travelPostId: id }, 'Failed to fetch travel post');
      return reply.status(500).send({ error: 'Failed to fetch travel post' });
    }
  });

  // Create travel post
  app.fastify.post('/api/travel-posts', {
    schema: {
      description: 'Create a new travel post',
      tags: ['travel-posts'],
      body: {
        type: 'object',
        required: ['title', 'fromCity', 'toCity', 'travelDate', 'type'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          fromCity: { type: 'string' },
          toCity: { type: 'string' },
          travelDate: { type: 'string', format: 'date' },
          type: { type: 'string', enum: ['looking_for_buddy', 'offering_companionship'] },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const body = request.body as TravelPostBody;
    app.logger.info({ userId: session.user.id, body }, 'Creating travel post');

    try {
      const [post] = await app.db
        .insert(schema.travelPosts)
        .values({
          userId: session.user.id,
          title: body.title,
          description: body.description,
          fromCity: body.fromCity,
          toCity: body.toCity,
          travelDate: body.travelDate,
          type: body.type,
        })
        .returning();

      app.logger.info({ travelPostId: post.id, userId: session.user.id }, 'Travel post created successfully');
      return post;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to create travel post');
      return reply.status(500).send({ error: 'Failed to create travel post' });
    }
  });

  // Update travel post
  app.fastify.put('/api/travel-posts/:id', {
    schema: {
      description: 'Update own travel post',
      tags: ['travel-posts'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          fromCity: { type: 'string' },
          toCity: { type: 'string' },
          travelDate: { type: 'string', format: 'date' },
          type: { type: 'string', enum: ['looking_for_buddy', 'offering_companionship'] },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const body = request.body as Partial<TravelPostBody>;
    app.logger.info({ userId: session.user.id, travelPostId: id, body }, 'Updating travel post');

    try {
      // Check ownership
      const existing = await app.db.query.travelPosts.findFirst({
        where: eq(schema.travelPosts.id, id),
      });

      if (!existing) {
        app.logger.warn({ travelPostId: id }, 'Travel post not found');
        return reply.status(404).send({ error: 'Travel post not found' });
      }

      if (existing.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, travelPostId: id }, 'Unauthorized travel post update attempt');
        return reply.status(403).send({ error: 'You can only update your own travel posts' });
      }

      const updateData: any = { updatedAt: new Date() };
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.fromCity !== undefined) updateData.fromCity = body.fromCity;
      if (body.toCity !== undefined) updateData.toCity = body.toCity;
      if (body.travelDate !== undefined) updateData.travelDate = body.travelDate;
      if (body.type !== undefined) updateData.type = body.type;

      const [updated] = await app.db
        .update(schema.travelPosts)
        .set(updateData)
        .where(eq(schema.travelPosts.id, id))
        .returning();

      app.logger.info({ travelPostId: id, userId: session.user.id }, 'Travel post updated successfully');
      return updated;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, travelPostId: id }, 'Failed to update travel post');
      return reply.status(500).send({ error: 'Failed to update travel post' });
    }
  });

  // Close travel post
  app.fastify.patch('/api/travel-posts/:id/close', {
    schema: {
      description: 'Close own travel post',
      tags: ['travel-posts'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    app.logger.info({ userId: session.user.id, travelPostId: id }, 'Closing travel post');

    try {
      // Check ownership
      const existing = await app.db.query.travelPosts.findFirst({
        where: eq(schema.travelPosts.id, id),
      });

      if (!existing) {
        app.logger.warn({ travelPostId: id }, 'Travel post not found');
        return reply.status(404).send({ error: 'Travel post not found' });
      }

      if (existing.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, travelPostId: id }, 'Unauthorized travel post close attempt');
        return reply.status(403).send({ error: 'You can only close your own travel posts' });
      }

      const [closed] = await app.db
        .update(schema.travelPosts)
        .set({ status: 'closed', updatedAt: new Date() })
        .where(eq(schema.travelPosts.id, id))
        .returning();

      app.logger.info({ travelPostId: id, userId: session.user.id }, 'Travel post closed successfully');
      return closed;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, travelPostId: id }, 'Failed to close travel post');
      return reply.status(500).send({ error: 'Failed to close travel post' });
    }
  });

  // Get current user's travel posts
  app.fastify.get('/api/my/travel-posts', {
    schema: {
      description: 'Get current user\'s travel posts',
      tags: ['travel-posts'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching user\'s travel posts');

    try {
      const posts = await app.db
        .select()
        .from(schema.travelPosts)
        .where(eq(schema.travelPosts.userId, session.user.id))
        .orderBy(schema.travelPosts.createdAt);

      app.logger.info({ userId: session.user.id, count: posts.length }, 'User travel posts fetched successfully');
      return posts;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch user travel posts');
      return reply.status(500).send({ error: 'Failed to fetch travel posts' });
    }
  });
}
