import type { App} from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lte, between, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';

interface TravelPostFilters {
  type?: 'offering' | 'seeking';
  fromCity?: string;
  toCity?: string;
  travelDate?: string;
  travelDateFrom?: string;
  travelDateTo?: string;
  limit?: string;
  offset?: string;
}

interface TravelPostBody {
  type: 'offering' | 'seeking';
  description?: string;
  fromCity: string;
  toCity: string;
  travelDate: string;
  // Seeking-specific fields
  companionshipFor?: 'Mother' | 'Father' | 'Parents' | 'MIL' | 'FIL' | 'Others';
  travelDateTo?: string;
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
          type: { type: 'string', enum: ['offering', 'seeking'] },
          fromCity: { type: 'string' },
          toCity: { type: 'string' },
          travelDate: { type: 'string' },
          travelDateFrom: { type: 'string' },
          travelDateTo: { type: 'string' },
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

      if (filters.type) {
        conditions.push(eq(schema.travelPosts.type, filters.type));
      }

      if (filters.fromCity) {
        conditions.push(eq(schema.travelPosts.fromCity, filters.fromCity));
      }

      if (filters.toCity) {
        conditions.push(eq(schema.travelPosts.toCity, filters.toCity));
      }

      if (filters.travelDate) {
        conditions.push(eq(schema.travelPosts.travelDate, filters.travelDate));
      }

      // Date range filtering (between travelDateFrom and travelDateTo)
      if (filters.travelDateFrom && filters.travelDateTo) {
        conditions.push(
          and(
            gte(schema.travelPosts.travelDate, filters.travelDateFrom),
            lte(schema.travelPosts.travelDate, filters.travelDateTo)
          )!
        );
      } else if (filters.travelDateFrom) {
        conditions.push(gte(schema.travelPosts.travelDate, filters.travelDateFrom));
      } else if (filters.travelDateTo) {
        conditions.push(lte(schema.travelPosts.travelDate, filters.travelDateTo));
      }

      const limit = parseInt(filters.limit || '20');
      const offset = parseInt(filters.offset || '0');

      const posts = await app.db
        .select({
          id: schema.travelPosts.id,
          userId: schema.travelPosts.userId,
          type: schema.travelPosts.type,
          description: schema.travelPosts.description,
          fromCity: schema.travelPosts.fromCity,
          toCity: schema.travelPosts.toCity,
          travelDate: schema.travelPosts.travelDate,
          companionshipFor: schema.travelPosts.companionshipFor,
          travelDateTo: schema.travelPosts.travelDateTo,
          status: schema.travelPosts.status,
          createdAt: schema.travelPosts.createdAt,
          updatedAt: schema.travelPosts.updatedAt,
          userName: schema.profiles.name,
        })
        .from(schema.travelPosts)
        .leftJoin(schema.profiles, eq(schema.travelPosts.userId, schema.profiles.userId))
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(schema.travelPosts.createdAt));

      // Transform to include user object
      const result = posts.map(post => ({
        ...post,
        user: {
          id: post.userId,
          name: post.userName || 'Unknown User',
        },
        userName: undefined,
      }));

      app.logger.info({ count: result.length }, 'Travel posts listed successfully');
      return result;
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
      const result = await app.db
        .select({
          id: schema.travelPosts.id,
          userId: schema.travelPosts.userId,
          type: schema.travelPosts.type,
          description: schema.travelPosts.description,
          fromCity: schema.travelPosts.fromCity,
          toCity: schema.travelPosts.toCity,
          travelDate: schema.travelPosts.travelDate,
          companionshipFor: schema.travelPosts.companionshipFor,
          travelDateTo: schema.travelPosts.travelDateTo,
          status: schema.travelPosts.status,
          createdAt: schema.travelPosts.createdAt,
          updatedAt: schema.travelPosts.updatedAt,
          userName: schema.profiles.name,
        })
        .from(schema.travelPosts)
        .leftJoin(schema.profiles, eq(schema.travelPosts.userId, schema.profiles.userId))
        .where(eq(schema.travelPosts.id, id))
        .limit(1);

      if (!result || result.length === 0) {
        app.logger.warn({ travelPostId: id }, 'Travel post not found');
        return reply.status(404).send({ error: 'Travel post not found' });
      }

      const post = result[0];
      const response = {
        ...post,
        user: {
          id: post.userId,
          name: post.userName || 'Unknown User',
        },
        userName: undefined,
      };

      app.logger.info({ travelPostId: id }, 'Travel post details fetched successfully');
      return response;
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
        required: ['type', 'fromCity', 'toCity', 'travelDate'],
        properties: {
          type: { type: 'string', enum: ['offering', 'seeking'] },
          description: { type: 'string' },
          fromCity: { type: 'string' },
          toCity: { type: 'string' },
          travelDate: { type: 'string' },
          companionshipFor: { type: 'string', enum: ['Mother', 'Father', 'Parents', 'MIL', 'FIL', 'Others'] },
          travelDateTo: { type: 'string' },
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
          type: body.type,
          description: body.description,
          fromCity: body.fromCity,
          toCity: body.toCity,
          travelDate: body.travelDate,
          companionshipFor: body.companionshipFor,
          travelDateTo: body.travelDateTo,
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
          type: { type: 'string', enum: ['offering', 'seeking'] },
          description: { type: 'string' },
          fromCity: { type: 'string' },
          toCity: { type: 'string' },
          travelDate: { type: 'string' },
          companionshipFor: { type: 'string', enum: ['Mother', 'Father', 'Parents', 'MIL', 'FIL', 'Others'] },
          travelDateTo: { type: 'string' },
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
      if (body.type !== undefined) updateData.type = body.type;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.fromCity !== undefined) updateData.fromCity = body.fromCity;
      if (body.toCity !== undefined) updateData.toCity = body.toCity;
      if (body.travelDate !== undefined) updateData.travelDate = body.travelDate;
      if (body.companionshipFor !== undefined) updateData.companionshipFor = body.companionshipFor;
      if (body.travelDateTo !== undefined) updateData.travelDateTo = body.travelDateTo;

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
