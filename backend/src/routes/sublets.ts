import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lte, between, or, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';

interface SubletFilters {
  city?: string;
  availableFrom?: string;
  availableTo?: string;
  minRent?: string;
  maxRent?: string;
  limit?: string;
  offset?: string;
}

interface SubletBody {
  title: string;
  description?: string;
  city: string;
  availableFrom: string;
  availableTo: string;
  rent?: string;
  imageUrls?: string[];
}

export function registerSubletRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // List sublets with filters
  app.fastify.get('/api/sublets', {
    schema: {
      description: 'List sublets with optional filters',
      tags: ['sublets'],
      querystring: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          availableFrom: { type: 'string', format: 'date' },
          availableTo: { type: 'string', format: 'date' },
          minRent: { type: 'string' },
          maxRent: { type: 'string' },
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const filters = request.query as SubletFilters;
    app.logger.info({ filters }, 'Listing sublets');

    try {
      const conditions: any[] = [eq(schema.sublets.status, 'active')];

      if (filters.city) {
        conditions.push(eq(schema.sublets.city, filters.city));
      }

      if (filters.availableFrom) {
        conditions.push(gte(schema.sublets.availableTo, filters.availableFrom));
      }

      if (filters.availableTo) {
        conditions.push(lte(schema.sublets.availableFrom, filters.availableTo));
      }

      if (filters.minRent) {
        conditions.push(gte(schema.sublets.rent, filters.minRent));
      }

      if (filters.maxRent) {
        conditions.push(lte(schema.sublets.rent, filters.maxRent));
      }

      const limit = parseInt(filters.limit || '20');
      const offset = parseInt(filters.offset || '0');

      const sublets = await app.db
        .select()
        .from(schema.sublets)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(schema.sublets.createdAt);

      app.logger.info({ count: sublets.length }, 'Sublets listed successfully');
      return sublets;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to list sublets');
      return reply.status(500).send({ error: 'Failed to list sublets' });
    }
  });

  // Get sublet by ID
  app.fastify.get('/api/sublets/:id', {
    schema: {
      description: 'Get sublet details by ID',
      tags: ['sublets'],
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
    app.logger.info({ subletId: id }, 'Fetching sublet details');

    try {
      const sublet = await app.db.query.sublets.findFirst({
        where: eq(schema.sublets.id, id),
      });

      if (!sublet) {
        app.logger.warn({ subletId: id }, 'Sublet not found');
        return reply.status(404).send({ error: 'Sublet not found' });
      }

      app.logger.info({ subletId: id }, 'Sublet details fetched successfully');
      return sublet;
    } catch (error) {
      app.logger.error({ err: error, subletId: id }, 'Failed to fetch sublet');
      return reply.status(500).send({ error: 'Failed to fetch sublet' });
    }
  });

  // Create sublet
  app.fastify.post('/api/sublets', {
    schema: {
      description: 'Create a new sublet post',
      tags: ['sublets'],
      body: {
        type: 'object',
        required: ['title', 'city', 'availableFrom', 'availableTo'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          city: { type: 'string' },
          availableFrom: { type: 'string', format: 'date' },
          availableTo: { type: 'string', format: 'date' },
          rent: { type: 'string' },
          imageUrls: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const body = request.body as SubletBody;
    app.logger.info({ userId: session.user.id, body }, 'Creating sublet');

    try {
      const [sublet] = await app.db
        .insert(schema.sublets)
        .values({
          userId: session.user.id,
          title: body.title,
          description: body.description,
          city: body.city,
          availableFrom: body.availableFrom,
          availableTo: body.availableTo,
          rent: body.rent,
          imageUrls: body.imageUrls,
        })
        .returning();

      app.logger.info({ subletId: sublet.id, userId: session.user.id }, 'Sublet created successfully');
      return sublet;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to create sublet');
      return reply.status(500).send({ error: 'Failed to create sublet' });
    }
  });

  // Update sublet
  app.fastify.put('/api/sublets/:id', {
    schema: {
      description: 'Update own sublet post',
      tags: ['sublets'],
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
          city: { type: 'string' },
          availableFrom: { type: 'string', format: 'date' },
          availableTo: { type: 'string', format: 'date' },
          rent: { type: 'string' },
          imageUrls: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const body = request.body as Partial<SubletBody>;
    app.logger.info({ userId: session.user.id, subletId: id, body }, 'Updating sublet');

    try {
      // Check ownership
      const existing = await app.db.query.sublets.findFirst({
        where: eq(schema.sublets.id, id),
      });

      if (!existing) {
        app.logger.warn({ subletId: id }, 'Sublet not found');
        return reply.status(404).send({ error: 'Sublet not found' });
      }

      if (existing.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, subletId: id }, 'Unauthorized sublet update attempt');
        return reply.status(403).send({ error: 'You can only update your own sublets' });
      }

      const updateData: any = { updatedAt: new Date() };
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.city !== undefined) updateData.city = body.city;
      if (body.availableFrom !== undefined) updateData.availableFrom = body.availableFrom;
      if (body.availableTo !== undefined) updateData.availableTo = body.availableTo;
      if (body.rent !== undefined) updateData.rent = body.rent;
      if (body.imageUrls !== undefined) updateData.imageUrls = body.imageUrls;

      const [updated] = await app.db
        .update(schema.sublets)
        .set(updateData)
        .where(eq(schema.sublets.id, id))
        .returning();

      app.logger.info({ subletId: id, userId: session.user.id }, 'Sublet updated successfully');
      return updated;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, subletId: id }, 'Failed to update sublet');
      return reply.status(500).send({ error: 'Failed to update sublet' });
    }
  });

  // Close sublet
  app.fastify.patch('/api/sublets/:id/close', {
    schema: {
      description: 'Close own sublet post',
      tags: ['sublets'],
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
    app.logger.info({ userId: session.user.id, subletId: id }, 'Closing sublet');

    try {
      // Check ownership
      const existing = await app.db.query.sublets.findFirst({
        where: eq(schema.sublets.id, id),
      });

      if (!existing) {
        app.logger.warn({ subletId: id }, 'Sublet not found');
        return reply.status(404).send({ error: 'Sublet not found' });
      }

      if (existing.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, subletId: id }, 'Unauthorized sublet close attempt');
        return reply.status(403).send({ error: 'You can only close your own sublets' });
      }

      const [closed] = await app.db
        .update(schema.sublets)
        .set({ status: 'closed', updatedAt: new Date() })
        .where(eq(schema.sublets.id, id))
        .returning();

      app.logger.info({ subletId: id, userId: session.user.id }, 'Sublet closed successfully');
      return closed;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, subletId: id }, 'Failed to close sublet');
      return reply.status(500).send({ error: 'Failed to close sublet' });
    }
  });

  // Get current user's sublets
  app.fastify.get('/api/my/sublets', {
    schema: {
      description: 'Get current user\'s sublet posts',
      tags: ['sublets'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching user\'s sublets');

    try {
      const sublets = await app.db
        .select()
        .from(schema.sublets)
        .where(eq(schema.sublets.userId, session.user.id))
        .orderBy(schema.sublets.createdAt);

      app.logger.info({ userId: session.user.id, count: sublets.length }, 'User sublets fetched successfully');
      return sublets;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch user sublets');
      return reply.status(500).send({ error: 'Failed to fetch sublets' });
    }
  });
}
