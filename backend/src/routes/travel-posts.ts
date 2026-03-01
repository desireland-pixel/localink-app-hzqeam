import type { App} from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, gte, lte, between, desc, asc, isNotNull, isNull, ne } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { TRAVEL_CITIES, COUNTRY_CITIES } from '../cities.js';
import { generateShortId } from '../utils/short-id.js';
import { formatDateToDDMMYYYY, parseDateFromDDMMYYYY } from '../utils/date-format.js';
import { formatTravelPostTitle, getTravelPostTypeEmojis } from '../utils/travel-post-formatter.js';
import { regenerateSignedUrls } from '../utils/image-url-regenerator.js';
import { formatIncentiveAmount, getIncentiveDisclaimer } from '../utils/incentive-formatter.js';

interface TravelPostFilters {
  fromCity?: string; // Independent from/to city filter
  toCity?: string; // Independent from/to city filter
  role?: 'offering' | 'seeking'; // Single role filter
  type?: string; // Multi-select: 'companionship' or 'ally' (can be comma-separated)
  travelDate?: string;
  travelDateFrom?: string;
  travelDateTo?: string;
  incentive?: string; // 'true' or 'false'
  sort?: 'newest' | 'earliest-departure' | 'latest-departure'; // Sorting option
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
  // Incentive field (in euros, 0.01 to 99.99, optional)
  incentiveAmount?: number;
  // Consent fields
  companionshipConsent?: boolean;
  allyConsent?: boolean;
  seekingConsent?: boolean;
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

// Helper function to auto-close expired travel posts
async function autoCloseExpiredTravelPosts(app: App): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Close offering and seeking posts if travelDate has passed
  await app.db
    .update(schema.travelPosts)
    .set({ status: 'closed', updatedAt: new Date() })
    .where(and(
      eq(schema.travelPosts.status, 'active'),
      or(
        // Offering and seeking posts: close if travelDate has passed
        lte(schema.travelPosts.travelDate, todayString),
        // Seeking posts: close if travelDateTo (end date) has passed
        and(
          isNotNull(schema.travelPosts.travelDateTo),
          lte(schema.travelPosts.travelDateTo, todayString)
        )
      )
    ));
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
          role: { type: 'string', enum: ['offering', 'seeking'] },
          type: { type: 'string' }, // 'companionship,ally' for multi-select
          travelDate: { type: 'string' },
          travelDateFrom: { type: 'string' },
          travelDateTo: { type: 'string' },
          incentive: { type: 'string', enum: ['true', 'false'] },
          sort: { type: 'string', enum: ['newest', 'earliest-departure', 'latest-departure'] },
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const filters = request.query as TravelPostFilters;
    app.logger.info({ filters }, 'Listing travel posts');

    try {
      // Auto-close expired travel posts
      await autoCloseExpiredTravelPosts(app);

      const conditions: any[] = [eq(schema.travelPosts.status, 'active'), isNull(schema.travelPosts.deletedAt)];

      // Filter by role (offering/seeking)
      if (filters.role) {
        if (filters.role === 'offering') {
          conditions.push(eq(schema.travelPosts.type, 'offering'));
        } else if (filters.role === 'seeking') {
          // 'seeking' role includes both 'seeking' and 'seeking-ally' types
          conditions.push(
            or(
              eq(schema.travelPosts.type, 'seeking'),
              eq(schema.travelPosts.type, 'seeking-ally')
            )!
          );
        }
      }

      // Filter by type (companionship/ally)
      // 'companionship' = seeking posts OR offering with canOfferCompanionship
      // 'ally' = seeking-ally posts OR offering with canCarryItems
      if (filters.type) {
        const types = filters.type.split(',').map(t => t.trim());
        const typeConditions: any[] = [];

        for (const t of types) {
          if (t === 'companionship') {
            // seeking posts are companionship, or offering with canOfferCompanionship
            typeConditions.push(
              or(
                eq(schema.travelPosts.type, 'seeking'),
                and(
                  eq(schema.travelPosts.type, 'offering'),
                  eq(schema.travelPosts.canOfferCompanionship, true)
                )!
              )!
            );
          } else if (t === 'ally') {
            // seeking-ally posts, or offering with canCarryItems
            typeConditions.push(
              or(
                eq(schema.travelPosts.type, 'seeking-ally'),
                and(
                  eq(schema.travelPosts.type, 'offering'),
                  eq(schema.travelPosts.canCarryItems, true)
                )!
              )!
            );
          }
        }

        if (typeConditions.length > 0) {
          // If multiple type filters are selected, combine them with OR
          // If only one is selected, use that condition directly
          if (typeConditions.length === 1) {
            conditions.push(typeConditions[0]);
          } else {
            conditions.push(or(...typeConditions)!);
          }
        }
      }

      // Independent from/to city filters with country expansion
      if (filters.fromCity) {
        const countryCities = COUNTRY_CITIES[filters.fromCity];
        if (countryCities) {
          // If it's a country, match the country name OR any city in that country
          conditions.push(
            or(
              eq(schema.travelPosts.fromCity, filters.fromCity),
              ...countryCities.map(city => eq(schema.travelPosts.fromCity, city))
            )!
          );
        } else {
          // It's a city, match exactly
          conditions.push(eq(schema.travelPosts.fromCity, filters.fromCity));
        }
      }

      if (filters.toCity) {
        const countryCities = COUNTRY_CITIES[filters.toCity];
        if (countryCities) {
          // If it's a country, match the country name OR any city in that country
          conditions.push(
            or(
              eq(schema.travelPosts.toCity, filters.toCity),
              ...countryCities.map(city => eq(schema.travelPosts.toCity, city))
            )!
          );
        } else {
          // It's a city, match exactly
          conditions.push(eq(schema.travelPosts.toCity, filters.toCity));
        }
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

      // Filter by incentive
      if (filters.incentive === 'true') {
        // Show only posts WITH incentives (incentiveAmount IS NOT NULL AND != '0')
        conditions.push(
          and(
            isNotNull(schema.travelPosts.incentiveAmount),
            ne(schema.travelPosts.incentiveAmount, '0')
          )!
        );
      } else if (filters.incentive === 'false') {
        // Show only posts WITHOUT incentives (incentiveAmount IS NULL OR = '0')
        conditions.push(
          or(
            isNull(schema.travelPosts.incentiveAmount),
            eq(schema.travelPosts.incentiveAmount, '0')
          )!
        );
      }

      const limit = parseInt(filters.limit || '20');
      const offset = parseInt(filters.offset || '0');

      // Determine sort order
      let orderByClause: any;
      if (filters.sort === 'earliest-departure') {
        // Primary sort by travelDate ASC, Secondary sort by travelDateTo ASC
        orderByClause = [asc(schema.travelPosts.travelDate), asc(schema.travelPosts.travelDateTo)];
      } else if (filters.sort === 'latest-departure') {
        // Primary sort by travelDateTo DESC, Secondary sort by travelDate DESC
        orderByClause = [desc(schema.travelPosts.travelDateTo), desc(schema.travelPosts.travelDate)];
      } else {
        // Default: newest (sort by createdAt DESC)
        orderByClause = desc(schema.travelPosts.createdAt);
      }

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
          incentiveAmount: schema.travelPosts.incentiveAmount,
          status: schema.travelPosts.status,
          createdAt: schema.travelPosts.createdAt,
          updatedAt: schema.travelPosts.updatedAt,
          username: schema.profiles.username,
        })
        .from(schema.travelPosts)
        .leftJoin(schema.profiles, eq(schema.travelPosts.userId, schema.profiles.userId))
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(orderByClause);

      // Transform to include user object, format dates, and add formatted title
      const result = await Promise.all(posts.map(async (post) => {
        // Convert dates to strings in YYYY-MM-DD format from database
        const travelDate = String(post.travelDate);
        const travelDateTo = post.travelDateTo ? String(post.travelDateTo) : null;

        const { title, tag } = formatTravelPostTitle(
          post.type as 'offering' | 'seeking' | 'seeking-ally',
          post.fromCity,
          post.toCity,
          post.canOfferCompanionship,
          post.canCarryItems
        );
        const typeEmojis = getTravelPostTypeEmojis(
          post.type as 'offering' | 'seeking' | 'seeking-ally',
          post.canOfferCompanionship,
          post.canCarryItems
        );

        const createdDate = new Date(post.createdAt);
        const formattedCreatedDate = createdDate.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
        const formattedIncentive = formatIncentiveAmount(post.incentiveAmount);

        return {
          ...post,
          travelDate: formatDateToDDMMYYYY(travelDate),
          travelDateTo: travelDateTo ? formatDateToDDMMYYYY(travelDateTo) : null,
          formattedTitle: title,
          tag: tag,
          typeEmojis: typeEmojis,
          ...(formattedIncentive ? {
            incentive: {
              amount: formattedIncentive,
              currency: '€',
              displayText: `€ ${formattedIncentive}`,
            }
          } : {}),
          isOwner: false, // Set to false for list endpoint (frontend can determine based on userId)
          user: {
            id: post.userId,
            username: post.username || 'Unknown User',
          },
          byline: `by ${post.username || 'Unknown User'} on ${formattedCreatedDate}`,
          username: undefined,
        };
      }));

      app.logger.info({ count: result.length, filters }, 'Travel posts listed successfully');
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
          incentiveAmount: schema.travelPosts.incentiveAmount,
          status: schema.travelPosts.status,
          createdAt: schema.travelPosts.createdAt,
          updatedAt: schema.travelPosts.updatedAt,
          username: schema.profiles.username,
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

      // Convert dates to strings in YYYY-MM-DD format from database
      const travelDate = String(post.travelDate);
      const travelDateTo = post.travelDateTo ? String(post.travelDateTo) : null;

      const { title, tag } = formatTravelPostTitle(
        post.type as 'offering' | 'seeking' | 'seeking-ally',
        post.fromCity,
        post.toCity,
        post.canOfferCompanionship,
        post.canCarryItems
      );
      const typeEmojis = getTravelPostTypeEmojis(
        post.type as 'offering' | 'seeking' | 'seeking-ally',
        post.canOfferCompanionship,
        post.canCarryItems
      );

      const formattedIncentive = formatIncentiveAmount(post.incentiveAmount);

      const response = {
        ...post,
        travelDate: formatDateToDDMMYYYY(travelDate),
        travelDateTo: travelDateTo ? formatDateToDDMMYYYY(travelDateTo) : null,
        formattedTitle: title,
        tag: tag,
        typeEmojis: typeEmojis,
        shortId: generateShortId(post.id),
        isOwner: false, // Will be determined by frontend based on userId
        ...(formattedIncentive ? {
          incentive: {
            amount: formattedIncentive,
            currency: '€',
            displayText: `€ ${formattedIncentive}`,
            disclaimer: getIncentiveDisclaimer(),
          }
        } : {}),
        user: {
          id: post.userId,
          username: post.username || 'Unknown User',
        },
        username: undefined,
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
          incentiveAmount: { type: 'number', minimum: 0.01, maximum: 99.99 },
          companionshipConsent: { type: 'boolean' },
          seekingConsent: { type: 'boolean' },
          allyConsent: { type: 'boolean' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            travelPostId: { type: 'string' },
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
      // Validation: check all required fields are provided
      if (!body.type || !body.fromCity || !body.toCity || !body.travelDate) {
        app.logger.warn({ body }, 'Missing required fields');
        return reply.status(400).send({ error: 'Please fill all mandatory fields' });
      }

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

      // Validation: check appropriate consent based on post type
      if (body.type === 'offering' && !body.companionshipConsent) {
        app.logger.warn({ type: body.type }, 'Offering posts require companionship consent');
        return reply.status(400).send({ error: 'Offering Companionship / Carry posts require consent acknowledgment' });
      }
      if (body.type === 'seeking' && !body.seekingConsent) {
        app.logger.warn({ type: body.type }, 'Seeking companionship posts require seeking consent');
        return reply.status(400).send({ error: 'Seeking Companionship posts require consent acknowledgment' });
      }
      if (body.type === 'seeking-ally' && !body.allyConsent) {
        app.logger.warn({ type: body.type }, 'Seeking ally posts require ally consent');
        return reply.status(400).send({ error: 'Seeking an Ally posts require consent acknowledgment' });
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
          incentiveAmount: body.incentiveAmount ? String(body.incentiveAmount) : null,
          companionshipConsent: body.companionshipConsent || false,
          allyConsent: body.allyConsent || false,
          seekingConsent: body.seekingConsent || false,
        })
        .returning();

      app.logger.info({ travelPostId: post.id, userId: session.user.id }, 'Travel post created successfully');

      return {
        travelPostId: post.id,
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
          incentiveAmount: { type: 'number', minimum: 0.01, maximum: 99.99 },
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
      if (body.incentiveAmount !== undefined) updateData.incentiveAmount = body.incentiveAmount ? String(body.incentiveAmount) : null;

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
        .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.travelPosts.id, id))
        .returning();

      app.logger.info({ travelPostId: id, userId: session.user.id }, 'Travel post closed successfully');
      return closed;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, travelPostId: id }, 'Failed to close travel post');
      return reply.status(500).send({ error: 'Failed to close travel post' });
    }
  });

  // Delete travel post (soft delete)
  app.fastify.delete('/api/travel-posts/:id', {
    schema: {
      description: 'Delete own travel post (soft delete, will be permanently removed after 30 days)',
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
    app.logger.info({ userId: session.user.id, travelPostId: id }, 'Soft deleting travel post');

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
        app.logger.warn({ userId: session.user.id, travelPostId: id }, 'Unauthorized travel post delete attempt');
        return reply.status(403).send({ error: 'You can only delete your own travel posts' });
      }

      // Soft delete the travel post (mark as deleted with timestamp)
      await app.db
        .update(schema.travelPosts)
        .set({
          status: 'deleted' as any,
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(schema.travelPosts.id, id));

      app.logger.info({ travelPostId: id, userId: session.user.id }, 'Travel post soft deleted successfully');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, travelPostId: id }, 'Failed to delete travel post');
      return reply.status(500).send({ error: 'Failed to delete travel post' });
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
