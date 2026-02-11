import type { App} from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lte, between, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { TRAVEL_CITIES } from '../cities.js';
import { generateShortId } from '../utils/short-id.js';
import { formatDateToDDMMYYYY, parseDateFromDDMMYYYY } from '../utils/date-format.js';

interface TravelPostFilters {
  type?: 'offering' | 'seeking' | 'seeking-ally';
  fromCity?: string;
  toCity?: string;
  travelDate?: string;
  travelDateFrom?: string;
  travelDateTo?: string;
  limit?: string;
  offset?: string;
}

interface TravelPostBody {
  type: 'offering' | 'seeking' | 'seeking-ally';
  description?: string;
  fromCity: string;
  toCity: string;
  travelDate: string;
  // Seeking-specific fields
  companionshipFor?: 'Mother' | 'Father' | 'Parents' | 'MIL' | 'FIL' | 'Others';
  travelDateTo?: string;
  // Seeking-ally specific field (free text)
  item?: string;
  // Offering-specific fields
  canOfferCompanionship?: boolean;
  canCarryItems?: boolean;
  // Offering-specific field
  alsoPostAsAlly?: boolean;
}

// Validation helper
function validateCity(city: string): boolean {
  return TRAVEL_CITIES.some(c => c.toLowerCase() === city.toLowerCase());
}

function isFutureDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Parse date - could be in YYYY-MM-DD or dd.mm.yyyy format
  let date: Date;
  if (dateStr.includes('-')) {
    // YYYY-MM-DD format
    date = new Date(dateStr);
  } else if (dateStr.includes('.')) {
    // dd.mm.yyyy format
    const [day, month, year] = dateStr.split('.');
    date = new Date(`${year}-${month}-${day}`);
  } else {
    return false;
  }
  return date >= today;
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
          type: { type: 'string', enum: ['offering', 'seeking', 'seeking-ally'] },
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
          item: schema.travelPosts.item,
          canOfferCompanionship: schema.travelPosts.canOfferCompanionship,
          canCarryItems: schema.travelPosts.canCarryItems,
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

      // Transform to include user object and format dates
      const result = posts.map(post => ({
        ...post,
        travelDate: formatDateToDDMMYYYY(post.travelDate as unknown as string),
        travelDateTo: post.travelDateTo ? formatDateToDDMMYYYY(post.travelDateTo as unknown as string) : null,
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
          item: schema.travelPosts.item,
          canOfferCompanionship: schema.travelPosts.canOfferCompanionship,
          canCarryItems: schema.travelPosts.canCarryItems,
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
        travelDate: formatDateToDDMMYYYY(post.travelDate as unknown as string),
        travelDateTo: post.travelDateTo ? formatDateToDDMMYYYY(post.travelDateTo as unknown as string) : null,
        shortId: generateShortId(post.id),
        user: {
          id: post.userId,
          name: post.userName || 'Unknown User',
        },
        userName: undefined,
      };

      app.logger.info({ travelPostId: id, shortId: response.shortId }, 'Travel post details fetched successfully');
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
          type: { type: 'string', enum: ['offering', 'seeking', 'seeking-ally'] },
          description: { type: 'string' },
          fromCity: { type: 'string' },
          toCity: { type: 'string' },
          travelDate: { type: 'string' },
          companionshipFor: { type: 'string', enum: ['Mother', 'Father', 'Parents', 'MIL', 'FIL', 'Others'] },
          travelDateTo: { type: 'string' },
          item: { type: 'string' },
          canOfferCompanionship: { type: 'boolean' },
          canCarryItems: { type: 'boolean' },
          alsoPostAsAlly: { type: 'boolean' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            travelPostId: { type: 'string' },
            carryPostId: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const body = request.body as TravelPostBody;
    app.logger.info({ userId: session.user.id, body }, 'Creating travel post');

    try {
      // Validation: cities must be from predefined list
      if (!validateCity(body.fromCity)) {
        app.logger.warn({ fromCity: body.fromCity }, 'Invalid fromCity');
        return reply.status(400).send({ error: 'Invalid fromCity. Must be from predefined list.' });
      }
      if (!validateCity(body.toCity)) {
        app.logger.warn({ toCity: body.toCity }, 'Invalid toCity');
        return reply.status(400).send({ error: 'Invalid toCity. Must be from predefined list.' });
      }

      // Validation: travelDate must be in the future
      if (!isFutureDate(body.travelDate)) {
        app.logger.warn({ travelDate: body.travelDate }, 'travelDate must be in the future');
        return reply.status(400).send({ error: 'travelDate must be in the future' });
      }

      // Validation: if travelDateTo is provided, it must be >= travelDate
      if (body.travelDateTo && body.travelDateTo < body.travelDate) {
        app.logger.warn({ travelDate: body.travelDate, travelDateTo: body.travelDateTo }, 'travelDateTo must be >= travelDate');
        return reply.status(400).send({ error: 'travelDateTo must be greater than or equal to travelDate' });
      }

      // Validation: seeking-ally type requires item field
      if (body.type === 'seeking-ally' && !body.item) {
        app.logger.warn({ type: body.type }, 'seeking-ally type requires item field');
        return reply.status(400).send({ error: 'Item field is required for seeking-ally posts' });
      }

      // Convert dates from dd.mm.yyyy to YYYY-MM-DD format
      const dbTravelDate = parseDateFromDDMMYYYY(body.travelDate);
      if (!dbTravelDate) {
        app.logger.warn({ travelDate: body.travelDate }, 'Invalid travelDate format');
        return reply.status(400).send({ error: 'Invalid travelDate format. Please use dd.mm.yyyy format.' });
      }

      let dbTravelDateTo: string | null = null;
      if (body.travelDateTo) {
        dbTravelDateTo = parseDateFromDDMMYYYY(body.travelDateTo);
        if (!dbTravelDateTo) {
          app.logger.warn({ travelDateTo: body.travelDateTo }, 'Invalid travelDateTo format');
          return reply.status(400).send({ error: 'Invalid travelDateTo format. Please use dd.mm.yyyy format.' });
        }
      }

      const [post] = await app.db
        .insert(schema.travelPosts)
        .values({
          userId: session.user.id,
          type: body.type,
          description: body.description,
          fromCity: body.fromCity,
          toCity: body.toCity,
          travelDate: dbTravelDate,
          companionshipFor: body.companionshipFor,
          travelDateTo: dbTravelDateTo,
          item: body.item,
          canOfferCompanionship: body.canOfferCompanionship,
          canCarryItems: body.canCarryItems,
        })
        .returning();

      app.logger.info({ travelPostId: post.id, userId: session.user.id }, 'Travel post created successfully');

      // If alsoPostAsAlly is true and type is 'offering', create a carry post
      let carryPostId: string | undefined;
      if (body.alsoPostAsAlly && body.type === 'offering') {
        const [carryPost] = await app.db
          .insert(schema.carryPosts)
          .values({
            userId: session.user.id,
            title: `Carry & Send: ${body.fromCity} to ${body.toCity}`,
            description: body.description,
            fromCity: body.fromCity,
            toCity: body.toCity,
            travelDate: dbTravelDate,
            type: 'traveler',
          })
          .returning();

        carryPostId = carryPost.id;
        app.logger.info({ carryPostId, travelPostId: post.id }, 'Associated carry post created');
      }

      return {
        travelPostId: post.id,
        ...(carryPostId && { carryPostId }),
      };
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
          type: { type: 'string', enum: ['offering', 'seeking', 'seeking-ally'] },
          description: { type: 'string' },
          fromCity: { type: 'string' },
          toCity: { type: 'string' },
          travelDate: { type: 'string' },
          companionshipFor: { type: 'string', enum: ['Mother', 'Father', 'Parents', 'MIL', 'FIL', 'Others'] },
          travelDateTo: { type: 'string' },
          item: { type: 'string' },
          canOfferCompanionship: { type: 'boolean' },
          canCarryItems: { type: 'boolean' },
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

      // Validation: if cities are provided, validate them
      if (body.fromCity && !validateCity(body.fromCity)) {
        app.logger.warn({ fromCity: body.fromCity }, 'Invalid fromCity');
        return reply.status(400).send({ error: 'Invalid fromCity. Must be from predefined list.' });
      }
      if (body.toCity && !validateCity(body.toCity)) {
        app.logger.warn({ toCity: body.toCity }, 'Invalid toCity');
        return reply.status(400).send({ error: 'Invalid toCity. Must be from predefined list.' });
      }

      // Validation: if travelDate is provided, it must be in the future
      if (body.travelDate && !isFutureDate(body.travelDate)) {
        app.logger.warn({ travelDate: body.travelDate }, 'travelDate must be in the future');
        return reply.status(400).send({ error: 'travelDate must be in the future' });
      }

      const updateData: any = { updatedAt: new Date() };
      if (body.type !== undefined) updateData.type = body.type;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.fromCity !== undefined) updateData.fromCity = body.fromCity;
      if (body.toCity !== undefined) updateData.toCity = body.toCity;

      // Convert dates from dd.mm.yyyy to YYYY-MM-DD format if provided
      if (body.travelDate !== undefined) {
        const dbDate = parseDateFromDDMMYYYY(body.travelDate);
        if (!dbDate) {
          app.logger.warn({ travelDate: body.travelDate }, 'Invalid travelDate format');
          return reply.status(400).send({ error: 'Invalid travelDate format. Please use dd.mm.yyyy format.' });
        }
        updateData.travelDate = dbDate;
      }

      if (body.companionshipFor !== undefined) updateData.companionshipFor = body.companionshipFor;

      if (body.travelDateTo !== undefined) {
        const dbDate = parseDateFromDDMMYYYY(body.travelDateTo);
        if (!dbDate) {
          app.logger.warn({ travelDateTo: body.travelDateTo }, 'Invalid travelDateTo format');
          return reply.status(400).send({ error: 'Invalid travelDateTo format. Please use dd.mm.yyyy format.' });
        }
        updateData.travelDateTo = dbDate;
      }

      if (body.item !== undefined) updateData.item = body.item;
      if (body.canOfferCompanionship !== undefined) updateData.canOfferCompanionship = body.canOfferCompanionship;
      if (body.canCarryItems !== undefined) updateData.canCarryItems = body.canCarryItems;

      const [updated] = await app.db
        .update(schema.travelPosts)
        .set(updateData)
        .where(eq(schema.travelPosts.id, id))
        .returning();

      app.logger.info({ travelPostId: id, userId: session.user.id }, 'Travel post updated successfully');
      // Format dates in response
      return {
        ...updated,
        travelDate: formatDateToDDMMYYYY(updated.travelDate as unknown as string),
        travelDateTo: updated.travelDateTo ? formatDateToDDMMYYYY(updated.travelDateTo as unknown as string) : null,
      };
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
