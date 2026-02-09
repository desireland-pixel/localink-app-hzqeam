import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';

interface CarryPostFilters {
  fromCity?: string;
  toCity?: string;
  travelDate?: string;
  type?: 'request' | 'traveler';
  limit?: string;
  offset?: string;
}

interface CarryPostBody {
  title: string;
  description?: string;
  fromCity: string;
  toCity: string;
  travelDate?: string;
  type: 'request' | 'traveler';
  itemDescription?: string;
}

export function registerCarryPostRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // List carry posts with filters
  app.fastify.get('/api/carry-posts', {
    schema: {
      description: 'List carry posts with optional filters',
      tags: ['carry-posts'],
      querystring: {
        type: 'object',
        properties: {
          fromCity: { type: 'string' },
          toCity: { type: 'string' },
          travelDate: { type: 'string', format: 'date' },
          type: { type: 'string', enum: ['request', 'traveler'] },
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const filters = request.query as CarryPostFilters;
    app.logger.info({ filters }, 'Listing carry posts');

    try {
      const conditions: any[] = [eq(schema.carryPosts.status, 'active')];

      if (filters.fromCity) {
        conditions.push(eq(schema.carryPosts.fromCity, filters.fromCity));
      }

      if (filters.toCity) {
        conditions.push(eq(schema.carryPosts.toCity, filters.toCity));
      }

      if (filters.travelDate) {
        conditions.push(eq(schema.carryPosts.travelDate, filters.travelDate));
      }

      if (filters.type) {
        conditions.push(eq(schema.carryPosts.type, filters.type));
      }

      const limit = parseInt(filters.limit || '20');
      const offset = parseInt(filters.offset || '0');

      const posts = await app.db
        .select()
        .from(schema.carryPosts)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(schema.carryPosts.createdAt);

      app.logger.info({ count: posts.length }, 'Carry posts listed successfully');
      return posts;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to list carry posts');
      return reply.status(500).send({ error: 'Failed to list carry posts' });
    }
  });

  // Get carry post by ID
  app.fastify.get('/api/carry-posts/:id', {
    schema: {
      description: 'Get carry post details by ID',
      tags: ['carry-posts'],
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
    app.logger.info({ carryPostId: id }, 'Fetching carry post details');

    try {
      const post = await app.db.query.carryPosts.findFirst({
        where: eq(schema.carryPosts.id, id),
      });

      if (!post) {
        app.logger.warn({ carryPostId: id }, 'Carry post not found');
        return reply.status(404).send({ error: 'Carry post not found' });
      }

      app.logger.info({ carryPostId: id }, 'Carry post details fetched successfully');
      return post;
    } catch (error) {
      app.logger.error({ err: error, carryPostId: id }, 'Failed to fetch carry post');
      return reply.status(500).send({ error: 'Failed to fetch carry post' });
    }
  });

  // Create carry post
  app.fastify.post('/api/carry-posts', {
    schema: {
      description: 'Create a new carry post',
      tags: ['carry-posts'],
      body: {
        type: 'object',
        required: ['title', 'fromCity', 'toCity', 'type'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          fromCity: { type: 'string' },
          toCity: { type: 'string' },
          travelDate: { type: 'string', format: 'date' },
          type: { type: 'string', enum: ['request', 'traveler'] },
          itemDescription: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const body = request.body as CarryPostBody;
    app.logger.info({ userId: session.user.id, body }, 'Creating carry post');

    try {
      const [post] = await app.db
        .insert(schema.carryPosts)
        .values({
          userId: session.user.id,
          title: body.title,
          description: body.description,
          fromCity: body.fromCity,
          toCity: body.toCity,
          travelDate: body.travelDate,
          type: body.type,
          itemDescription: body.itemDescription,
        })
        .returning();

      app.logger.info({ carryPostId: post.id, userId: session.user.id }, 'Carry post created successfully');
      return post;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to create carry post');
      return reply.status(500).send({ error: 'Failed to create carry post' });
    }
  });

  // Update carry post
  app.fastify.put('/api/carry-posts/:id', {
    schema: {
      description: 'Update own carry post',
      tags: ['carry-posts'],
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
          type: { type: 'string', enum: ['request', 'traveler'] },
          itemDescription: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const body = request.body as Partial<CarryPostBody>;
    app.logger.info({ userId: session.user.id, carryPostId: id, body }, 'Updating carry post');

    try {
      // Check ownership
      const existing = await app.db.query.carryPosts.findFirst({
        where: eq(schema.carryPosts.id, id),
      });

      if (!existing) {
        app.logger.warn({ carryPostId: id }, 'Carry post not found');
        return reply.status(404).send({ error: 'Carry post not found' });
      }

      if (existing.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, carryPostId: id }, 'Unauthorized carry post update attempt');
        return reply.status(403).send({ error: 'You can only update your own carry posts' });
      }

      const updateData: any = { updatedAt: new Date() };
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.fromCity !== undefined) updateData.fromCity = body.fromCity;
      if (body.toCity !== undefined) updateData.toCity = body.toCity;
      if (body.travelDate !== undefined) updateData.travelDate = body.travelDate;
      if (body.type !== undefined) updateData.type = body.type;
      if (body.itemDescription !== undefined) updateData.itemDescription = body.itemDescription;

      const [updated] = await app.db
        .update(schema.carryPosts)
        .set(updateData)
        .where(eq(schema.carryPosts.id, id))
        .returning();

      app.logger.info({ carryPostId: id, userId: session.user.id }, 'Carry post updated successfully');
      return updated;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, carryPostId: id }, 'Failed to update carry post');
      return reply.status(500).send({ error: 'Failed to update carry post' });
    }
  });

  // Close carry post
  app.fastify.patch('/api/carry-posts/:id/close', {
    schema: {
      description: 'Close own carry post',
      tags: ['carry-posts'],
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
    app.logger.info({ userId: session.user.id, carryPostId: id }, 'Closing carry post');

    try {
      // Check ownership
      const existing = await app.db.query.carryPosts.findFirst({
        where: eq(schema.carryPosts.id, id),
      });

      if (!existing) {
        app.logger.warn({ carryPostId: id }, 'Carry post not found');
        return reply.status(404).send({ error: 'Carry post not found' });
      }

      if (existing.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, carryPostId: id }, 'Unauthorized carry post close attempt');
        return reply.status(403).send({ error: 'You can only close your own carry posts' });
      }

      const [closed] = await app.db
        .update(schema.carryPosts)
        .set({ status: 'closed', updatedAt: new Date() })
        .where(eq(schema.carryPosts.id, id))
        .returning();

      app.logger.info({ carryPostId: id, userId: session.user.id }, 'Carry post closed successfully');
      return closed;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, carryPostId: id }, 'Failed to close carry post');
      return reply.status(500).send({ error: 'Failed to close carry post' });
    }
  });

  // Get current user's carry posts
  app.fastify.get('/api/my/carry-posts', {
    schema: {
      description: 'Get current user\'s carry posts',
      tags: ['carry-posts'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching user\'s carry posts');

    try {
      const posts = await app.db
        .select()
        .from(schema.carryPosts)
        .where(eq(schema.carryPosts.userId, session.user.id))
        .orderBy(schema.carryPosts.createdAt);

      app.logger.info({ userId: session.user.id, count: posts.length }, 'User carry posts fetched successfully');
      return posts;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch user carry posts');
      return reply.status(500).send({ error: 'Failed to fetch carry posts' });
    }
  });
}
