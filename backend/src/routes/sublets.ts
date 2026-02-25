import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, gte, lte, isNull, isNotNull, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { generateShortId } from '../utils/short-id.js';
import { formatDateToDDMMYYYY, parseDateFromDDMMYYYY } from '../utils/date-format.js';
import { regenerateSignedUrls } from '../utils/image-url-regenerator.js';

interface SubletFilters {
  type?: 'offering' | 'seeking';
  city?: string;
  availableFrom?: string;
  availableTo?: string;
  minRent?: string;
  maxRent?: string;
  cityRegistrationRequired?: string;
  limit?: string;
  offset?: string;
}

interface SubletBody {
  type: 'offering' | 'seeking';
  title: string;
  description?: string;
  city: string;
  availableFrom: string;
  availableTo: string;
  rent?: string;
  imageUrls?: string[];
  // Common fields
  cityRegistrationRequired?: boolean;
  // Offering-specific fields
  address?: string;
  pincode?: string;
  deposit?: string;
  // Consent field
  independentArrangementConsent?: boolean;
}

// Helper function to auto-close expired sublets
async function autoCloseExpiredSublets(app: App): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

  await app.db
    .update(schema.sublets)
    .set({ status: 'closed', updatedAt: new Date() })
    .where(and(
      eq(schema.sublets.status, 'active'),
      lte(schema.sublets.availableTo, todayString)
    ));
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
          type: { type: 'string', enum: ['offering', 'seeking'] },
          city: { type: 'string' },
          availableFrom: { type: 'string' },
          availableTo: { type: 'string' },
          minRent: { type: 'string' },
          maxRent: { type: 'string' },
          cityRegistrationRequired: { type: 'string', enum: ['yes', 'no'] },
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const filters = request.query as SubletFilters;
    app.logger.info({ filters }, 'Listing sublets');

    try {
      // Auto-close expired sublets
      await autoCloseExpiredSublets(app);

      const conditions: any[] = [eq(schema.sublets.status, 'active')];

      // Handle type filter
      if (filters.type) {
        conditions.push(eq(schema.sublets.type, filters.type));
      }

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

      // Handle cityRegistrationRequired filter
      // Apply to both offering and seeking posts
      if (filters.cityRegistrationRequired === 'yes') {
        conditions.push(eq(schema.sublets.cityRegistrationRequired, true));
      } else if (filters.cityRegistrationRequired === 'no') {
        conditions.push(eq(schema.sublets.cityRegistrationRequired, false));
      }

      const limit = parseInt(filters.limit || '20');
      const offset = parseInt(filters.offset || '0');

      const sublets = await app.db
        .select({
          id: schema.sublets.id,
          userId: schema.sublets.userId,
          type: schema.sublets.type,
          title: schema.sublets.title,
          description: schema.sublets.description,
          city: schema.sublets.city,
          availableFrom: schema.sublets.availableFrom,
          availableTo: schema.sublets.availableTo,
          rent: schema.sublets.rent,
          imageUrls: schema.sublets.imageUrls,
          address: schema.sublets.address,
          pincode: schema.sublets.pincode,
          cityRegistrationRequired: schema.sublets.cityRegistrationRequired,
          deposit: schema.sublets.deposit,
          status: schema.sublets.status,
          createdAt: schema.sublets.createdAt,
          updatedAt: schema.sublets.updatedAt,
          username: schema.profiles.username,
        })
        .from(schema.sublets)
        .leftJoin(schema.profiles, eq(schema.sublets.userId, schema.profiles.userId))
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(schema.sublets.createdAt));

      // Transform to include user object and format dates
      const result = await Promise.all(sublets.map(async (sublet) => {
        // Dates come as strings from database in YYYY-MM-DD format
        const fromDate = String(sublet.availableFrom);
        const toDate = String(sublet.availableTo);

        // Regenerate fresh signed URLs for images
        const freshImageUrls = await regenerateSignedUrls(app, sublet.imageUrls);

        return {
          ...sublet,
          imageUrls: freshImageUrls,
          availableFrom: formatDateToDDMMYYYY(fromDate),
          availableTo: formatDateToDDMMYYYY(toDate),
          isOwner: false, // Set to false for list endpoint (frontend can determine based on userId)
          user: {
            id: sublet.userId,
            username: sublet.username || 'Unknown User',
          },
          username: undefined, // Remove flat username field
        };
      }));

      app.logger.info({ count: result.length, filters }, 'Sublets listed successfully');
      return result;
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
      const result = await app.db
        .select({
          id: schema.sublets.id,
          userId: schema.sublets.userId,
          type: schema.sublets.type,
          title: schema.sublets.title,
          description: schema.sublets.description,
          city: schema.sublets.city,
          availableFrom: schema.sublets.availableFrom,
          availableTo: schema.sublets.availableTo,
          rent: schema.sublets.rent,
          imageUrls: schema.sublets.imageUrls,
          address: schema.sublets.address,
          pincode: schema.sublets.pincode,
          cityRegistrationRequired: schema.sublets.cityRegistrationRequired,
          deposit: schema.sublets.deposit,
          status: schema.sublets.status,
          createdAt: schema.sublets.createdAt,
          updatedAt: schema.sublets.updatedAt,
          username: schema.profiles.username,
        })
        .from(schema.sublets)
        .leftJoin(schema.profiles, eq(schema.sublets.userId, schema.profiles.userId))
        .where(eq(schema.sublets.id, id))
        .limit(1);

      if (!result || result.length === 0) {
        app.logger.warn({ subletId: id }, 'Sublet not found');
        return reply.status(404).send({ error: 'Sublet not found' });
      }

      const sublet = result[0];

      // Dates come as strings from database in YYYY-MM-DD format
      const fromDate = String(sublet.availableFrom);
      const toDate = String(sublet.availableTo);

      // Regenerate fresh signed URLs for images
      const freshImageUrls = await regenerateSignedUrls(app, sublet.imageUrls);

      const response = {
        ...sublet,
        imageUrls: freshImageUrls,
        availableFrom: formatDateToDDMMYYYY(fromDate),
        availableTo: formatDateToDDMMYYYY(toDate),
        shortId: generateShortId(sublet.id),
        isOwner: false, // Will be determined by frontend based on userId
        user: {
          id: sublet.userId,
          username: sublet.username || 'Unknown User',
        },
        username: undefined,
      };

      app.logger.info({ subletId: id, shortId: response.shortId }, 'Sublet details fetched successfully');
      return response;
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
        required: ['type', 'title', 'city', 'availableFrom', 'availableTo', 'independentArrangementConsent'],
        properties: {
          type: { type: 'string', enum: ['offering', 'seeking'] },
          title: { type: 'string' },
          description: { type: 'string' },
          city: { type: 'string' },
          availableFrom: { type: 'string' },
          availableTo: { type: 'string' },
          rent: { type: 'string' },
          imageUrls: { type: 'array', items: { type: 'string' } },
          address: { type: 'string' },
          pincode: { type: 'string' },
          cityRegistrationRequired: { type: 'boolean' },
          deposit: { type: 'string' },
          independentArrangementConsent: { type: 'boolean' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const body = request.body as SubletBody;
    app.logger.info({ userId: session.user.id, body }, 'Creating sublet');

    try {
      // Validate required fields
      if (!body.type || !body.title || !body.city || !body.availableFrom || !body.availableTo) {
        app.logger.warn({ body }, 'Missing required fields');
        return reply.status(400).send({ error: 'Please fill all mandatory fields' });
      }

      // Convert dates from dd.mm.yyyy to YYYY-MM-DD format
      const dbAvailableFrom = parseDateFromDDMMYYYY(body.availableFrom);
      const dbAvailableTo = parseDateFromDDMMYYYY(body.availableTo);

      if (!dbAvailableFrom || !dbAvailableTo) {
        app.logger.warn({ availableFrom: body.availableFrom, availableTo: body.availableTo }, 'Invalid date format');
        return reply.status(400).send({ error: 'Invalid date format. Please use dd.mm.yyyy format.' });
      }

      // Validate dates: availableTo must be after availableFrom
      if (dbAvailableTo <= dbAvailableFrom) {
        app.logger.warn({ availableFrom: dbAvailableFrom, availableTo: dbAvailableTo }, 'Available To date must be after Available From date');
        // Use different message based on type
        const errorMsg = body.type === 'offering'
          ? 'Available To date must be after Available From date'
          : 'Move-out date must be after Move-in date';
        return reply.status(400).send({ error: errorMsg });
      }

      // Validate that availableFrom is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const fromDate = new Date(dbAvailableFrom);
      if (fromDate < today) {
        app.logger.warn({ availableFrom: dbAvailableFrom }, 'Start date cannot be in the past');
        return reply.status(400).send({ error: 'Start date cannot be in the past' });
      }

      // Validate consent for sublets
      if (!body.independentArrangementConsent) {
        app.logger.warn({ userId: session.user.id }, 'Sublet posts require independent arrangement consent');
        return reply.status(400).send({ error: 'Sublet posts require consent acknowledgment' });
      }

      const [sublet] = await app.db
        .insert(schema.sublets)
        .values({
          userId: session.user.id,
          type: body.type,
          title: body.title,
          description: body.description,
          city: body.city,
          availableFrom: dbAvailableFrom,
          availableTo: dbAvailableTo,
          rent: body.rent,
          imageUrls: body.imageUrls,
          address: body.address,
          pincode: body.pincode,
          cityRegistrationRequired: body.cityRegistrationRequired,
          deposit: body.deposit,
          independentArrangementConsent: body.independentArrangementConsent || false,
        })
        .returning();

      app.logger.info({ subletId: sublet.id, userId: session.user.id }, 'Sublet created successfully');
      // Format dates in response
      return {
        ...sublet,
        availableFrom: formatDateToDDMMYYYY(sublet.availableFrom as unknown as string),
        availableTo: formatDateToDDMMYYYY(sublet.availableTo as unknown as string),
      };
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
          type: { type: 'string', enum: ['offering', 'seeking'] },
          title: { type: 'string' },
          description: { type: 'string' },
          city: { type: 'string' },
          availableFrom: { type: 'string' },
          availableTo: { type: 'string' },
          rent: { type: 'string' },
          imageUrls: { type: 'array', items: { type: 'string' } },
          address: { type: 'string' },
          pincode: { type: 'string' },
          cityRegistrationRequired: { type: 'boolean' },
          deposit: { type: 'string' },
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
      if (body.type !== undefined) updateData.type = body.type;
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.city !== undefined) updateData.city = body.city;

      // Convert dates from dd.mm.yyyy to YYYY-MM-DD format if provided
      if (body.availableFrom !== undefined) {
        const dbDate = parseDateFromDDMMYYYY(body.availableFrom);
        if (!dbDate) {
          app.logger.warn({ availableFrom: body.availableFrom }, 'Invalid availableFrom date format');
          return reply.status(400).send({ error: 'Invalid availableFrom format. Please use dd.mm.yyyy format.' });
        }
        updateData.availableFrom = dbDate;
      }

      if (body.availableTo !== undefined) {
        const dbDate = parseDateFromDDMMYYYY(body.availableTo);
        if (!dbDate) {
          app.logger.warn({ availableTo: body.availableTo }, 'Invalid availableTo date format');
          return reply.status(400).send({ error: 'Invalid availableTo format. Please use dd.mm.yyyy format.' });
        }
        updateData.availableTo = dbDate;
      }

      if (body.rent !== undefined) updateData.rent = body.rent;
      if (body.imageUrls !== undefined) updateData.imageUrls = body.imageUrls;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.pincode !== undefined) updateData.pincode = body.pincode;
      if (body.cityRegistrationRequired !== undefined) updateData.cityRegistrationRequired = body.cityRegistrationRequired;
      if (body.deposit !== undefined) updateData.deposit = body.deposit;

      const [updated] = await app.db
        .update(schema.sublets)
        .set(updateData)
        .where(eq(schema.sublets.id, id))
        .returning();

      app.logger.info({ subletId: id, userId: session.user.id }, 'Sublet updated successfully');
      // Format dates in response
      return {
        ...updated,
        availableFrom: formatDateToDDMMYYYY(updated.availableFrom as unknown as string),
        availableTo: formatDateToDDMMYYYY(updated.availableTo as unknown as string),
      };
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

  // Delete sublet permanently
  app.fastify.delete('/api/sublets/:id', {
    schema: {
      description: 'Permanently delete own sublet post',
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
    app.logger.info({ userId: session.user.id, subletId: id }, 'Deleting sublet permanently');

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
        app.logger.warn({ userId: session.user.id, subletId: id }, 'Unauthorized sublet delete attempt');
        return reply.status(403).send({ error: 'You can only delete your own sublets' });
      }

      // Permanently delete the sublet
      await app.db
        .delete(schema.sublets)
        .where(eq(schema.sublets.id, id));

      app.logger.info({ subletId: id, userId: session.user.id }, 'Sublet deleted permanently');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, subletId: id }, 'Failed to delete sublet');
      return reply.status(500).send({ error: 'Failed to delete sublet' });
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
        .orderBy(desc(schema.sublets.createdAt));

      app.logger.info({ userId: session.user.id, count: sublets.length }, 'User sublets fetched successfully');
      return sublets;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch user sublets');
      return reply.status(500).send({ error: 'Failed to fetch sublets' });
    }
  });
}
