import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { formatDateToDDMMYYYY } from '../utils/date-format.js';
import { formatTravelPostTitle, getTravelPostTypeEmojis } from '../utils/travel-post-formatter.js';
import { regenerateSignedUrls } from '../utils/image-url-regenerator.js';

interface CreateFavoriteBody {
  postId: string;
  postType: 'sublet' | 'travel' | 'community';
}

interface FavoriteCheckQuery {
  postType: 'sublet' | 'travel' | 'community';
}

export function registerFavoriteRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Create favorite
  app.fastify.post('/api/favorites', {
    schema: {
      description: 'Create a favorite (like) for a post',
      tags: ['favorites'],
      body: {
        type: 'object',
        required: ['postId', 'postType'],
        properties: {
          postId: { type: 'string', format: 'uuid' },
          postType: { type: 'string', enum: ['sublet', 'travel', 'community'] },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            favorite: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                postId: { type: 'string' },
                postType: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { postId, postType } = request.body as CreateFavoriteBody;
    app.logger.info({ userId: session.user.id, postId, postType }, 'Creating favorite');

    try {
      const [favorite] = await app.db
        .insert(schema.favorites)
        .values({
          userId: session.user.id,
          postId,
          postType,
        })
        .returning();

      app.logger.info({ favoriteId: favorite.id, userId: session.user.id }, 'Favorite created successfully');
      reply.status(201);
      return {
        success: true,
        favorite,
      };
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        app.logger.warn({ userId: session.user.id, postId }, 'Favorite already exists');
        return reply.status(409).send({ error: 'Already favorited' });
      }
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to create favorite');
      return reply.status(500).send({ error: 'Failed to create favorite' });
    }
  });

  // Delete favorite
  app.fastify.delete('/api/favorites/:postId', {
    schema: {
      description: 'Delete a favorite (like) for a post',
      tags: ['favorites'],
      params: {
        type: 'object',
        properties: {
          postId: { type: 'string', format: 'uuid' },
        },
        required: ['postId'],
      },
      querystring: {
        type: 'object',
        properties: {
          postType: { type: 'string', enum: ['sublet', 'travel', 'community'] },
        },
        required: ['postType'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { postId } = request.params as { postId: string };
    const { postType } = request.query as FavoriteCheckQuery;
    app.logger.info({ userId: session.user.id, postId, postType }, 'Deleting favorite');

    try {
      // Check ownership - favorite must belong to current user
      const favorite = await app.db.query.favorites.findFirst({
        where: and(
          eq(schema.favorites.userId, session.user.id),
          eq(schema.favorites.postId, postId),
          eq(schema.favorites.postType, postType)
        ),
      });

      if (!favorite) {
        app.logger.warn({ userId: session.user.id, postId }, 'Favorite not found or not owned by user');
        return reply.status(404).send({ error: 'Favorite not found' });
      }

      await app.db
        .delete(schema.favorites)
        .where(eq(schema.favorites.id, favorite.id));

      app.logger.info({ favoriteId: favorite.id, userId: session.user.id }, 'Favorite deleted successfully');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to delete favorite');
      return reply.status(500).send({ error: 'Failed to delete favorite' });
    }
  });

  // Check if post is favorited
  app.fastify.get('/api/favorites/check/:postId', {
    schema: {
      description: 'Check if a post is favorited by current user',
      tags: ['favorites'],
      params: {
        type: 'object',
        properties: {
          postId: { type: 'string', format: 'uuid' },
        },
        required: ['postId'],
      },
      querystring: {
        type: 'object',
        properties: {
          postType: { type: 'string', enum: ['sublet', 'travel', 'community'] },
        },
        required: ['postType'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            isFavorited: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { postId } = request.params as { postId: string };
    const { postType } = request.query as FavoriteCheckQuery;

    try {
      const favorite = await app.db.query.favorites.findFirst({
        where: and(
          eq(schema.favorites.userId, session.user.id),
          eq(schema.favorites.postId, postId),
          eq(schema.favorites.postType, postType)
        ),
      });

      return { isFavorited: !!favorite };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to check favorite');
      return reply.status(500).send({ error: 'Failed to check favorite' });
    }
  });

  // Get user's favorites
  app.fastify.get('/api/favorites', {
    schema: {
      description: 'Get current user\'s favorites',
      tags: ['favorites'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { limit, offset } = request.query as { limit?: string; offset?: string };
    const pageLimit = parseInt(limit || '50');
    const pageOffset = parseInt(offset || '0');

    app.logger.info({ userId: session.user.id }, 'Fetching user favorites');

    try {
      const favorites = await app.db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.userId, session.user.id))
        .limit(pageLimit)
        .offset(pageOffset);

      // For each favorite, fetch the corresponding post details with full formatting
      const favoritesWithPosts = await Promise.all(
        favorites.map(async (fav) => {
          let post: any = null;

          if (fav.postType === 'sublet') {
            const sublet = await app.db
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
              .where(eq(schema.sublets.id, fav.postId))
              .limit(1);

            if (sublet.length > 0) {
              const s = sublet[0];
              const fromDate = String(s.availableFrom);
              const toDate = String(s.availableTo);

              // Check if post is expired
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
              const isExpired = toDate < todayString;

              // Regenerate fresh signed URLs for images
              const freshImageUrls = await regenerateSignedUrls(app, s.imageUrls);

              post = {
                ...s,
                imageUrls: freshImageUrls,
                postType: 'sublet',
                isExpired: isExpired,
                availableFrom: formatDateToDDMMYYYY(fromDate),
                availableTo: formatDateToDDMMYYYY(toDate),
                user: {
                  id: s.userId,
                  username: s.username || 'Unknown User',
                },
                username: undefined,
              };
            }
          } else if (fav.postType === 'travel') {
            const travel = await app.db
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
              .where(eq(schema.travelPosts.id, fav.postId))
              .limit(1);

            if (travel.length > 0) {
              const t = travel[0];
              const travelDate = String(t.travelDate);
              const travelDateTo = t.travelDateTo ? String(t.travelDateTo) : null;

              // Check if post is expired
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
              const isExpired = travelDate < todayString || (travelDateTo && travelDateTo < todayString);

              const { title, tag } = formatTravelPostTitle(
                t.type as 'offering' | 'seeking' | 'seeking-ally',
                t.fromCity,
                t.toCity,
                t.canOfferCompanionship,
                t.canCarryItems
              );
              const typeEmojis = getTravelPostTypeEmojis(
                t.type as 'offering' | 'seeking' | 'seeking-ally',
                t.canOfferCompanionship,
                t.canCarryItems
              );

              post = {
                ...t,
                postType: 'travel',
                isExpired: isExpired,
                travelDate: formatDateToDDMMYYYY(travelDate),
                travelDateTo: travelDateTo ? formatDateToDDMMYYYY(travelDateTo) : null,
                formattedTitle: title,
                tag: tag,
                typeEmojis: typeEmojis,
                user: {
                  id: t.userId,
                  username: t.username || 'Unknown User',
                },
                username: undefined,
              };
            }
          } else if (fav.postType === 'community') {
            const community = await app.db
              .select({
                id: schema.discussionTopics.id,
                userId: schema.discussionTopics.userId,
                category: schema.discussionTopics.category,
                location: schema.discussionTopics.location,
                title: schema.discussionTopics.title,
                description: schema.discussionTopics.description,
                status: schema.discussionTopics.status,
                repliesCount: schema.discussionTopics.repliesCount,
                createdAt: schema.discussionTopics.createdAt,
                updatedAt: schema.discussionTopics.updatedAt,
                username: schema.profiles.username,
              })
              .from(schema.discussionTopics)
              .leftJoin(schema.profiles, eq(schema.discussionTopics.userId, schema.profiles.userId))
              .where(eq(schema.discussionTopics.id, fav.postId))
              .limit(1);

            if (community.length > 0) {
              const c = community[0];
              const createdDate = new Date(c.createdAt);
              const formattedCreatedDate = createdDate.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });

              post = {
                ...c,
                postType: 'community',
                shortId: undefined, // Will be calculated by frontend if needed
                user: {
                  id: c.userId,
                  username: c.username || 'Unknown User',
                },
                byline: `by ${c.username || 'Unknown User'} on ${formattedCreatedDate}`,
                username: undefined,
              };
            }
          }

          return {
            favoriteId: fav.id,
            postId: fav.postId,
            postType: fav.postType,
            createdAt: fav.createdAt,
            post,
          };
        })
      );

      app.logger.info({ userId: session.user.id, count: favoritesWithPosts.length }, 'Favorites fetched successfully');
      return favoritesWithPosts;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch favorites');
      return reply.status(500).send({ error: 'Failed to fetch favorites' });
    }
  });
}
