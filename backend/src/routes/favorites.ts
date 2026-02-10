import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';

interface CreateFavoriteBody {
  postId: string;
  postType: 'sublet' | 'travel' | 'carry';
}

interface FavoriteCheckQuery {
  postType: 'sublet' | 'travel' | 'carry';
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
          postType: { type: 'string', enum: ['sublet', 'travel', 'carry'] },
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
          postType: { type: 'string', enum: ['sublet', 'travel', 'carry'] },
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
          postType: { type: 'string', enum: ['sublet', 'travel', 'carry'] },
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

      // For each favorite, fetch the corresponding post details
      const favoritesWithPosts = await Promise.all(
        favorites.map(async (fav) => {
          let post = null;

          if (fav.postType === 'sublet') {
            post = await app.db.query.sublets.findFirst({
              where: eq(schema.sublets.id, fav.postId),
            });
          } else if (fav.postType === 'travel') {
            post = await app.db.query.travelPosts.findFirst({
              where: eq(schema.travelPosts.id, fav.postId),
            });
          } else if (fav.postType === 'carry') {
            post = await app.db.query.carryPosts.findFirst({
              where: eq(schema.carryPosts.id, fav.postId),
            });
          }

          return {
            ...fav,
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
