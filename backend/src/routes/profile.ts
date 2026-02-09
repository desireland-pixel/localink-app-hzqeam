import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerProfileRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Get current user profile
  app.fastify.get('/api/profile', {
    schema: {
      description: 'Get current user profile',
      tags: ['profile'],
      response: {
        200: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            name: { type: 'string' },
            city: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching user profile');

    const profile = await app.db.query.profiles.findFirst({
      where: eq(schema.profiles.userId, session.user.id),
    });

    if (!profile) {
      app.logger.warn({ userId: session.user.id }, 'Profile not found');
      return reply.status(404).send({ error: 'Profile not found' });
    }

    app.logger.info({ userId: session.user.id }, 'Profile fetched successfully');
    return profile;
  });

  // Update user profile (or create if not exists)
  app.fastify.put('/api/profile', {
    schema: {
      description: 'Update or create user profile',
      tags: ['profile'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          city: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            name: { type: 'string' },
            city: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { name, city } = request.body as { name?: string; city?: string };

    app.logger.info({ userId: session.user.id, name, city }, 'Updating user profile');

    try {
      // Check if profile exists
      const existingProfile = await app.db.query.profiles.findFirst({
        where: eq(schema.profiles.userId, session.user.id),
      });

      if (existingProfile) {
        // Update existing profile
        const updateData: any = { updatedAt: new Date() };
        if (name !== undefined) updateData.name = name;
        if (city !== undefined) updateData.city = city;

        const [updated] = await app.db
          .update(schema.profiles)
          .set(updateData)
          .where(eq(schema.profiles.userId, session.user.id))
          .returning();

        app.logger.info({ userId: session.user.id }, 'Profile updated successfully');
        return updated;
      } else {
        // Create new profile
        if (!name || !city) {
          app.logger.warn({ userId: session.user.id }, 'Name and city required for profile creation');
          return reply.status(400).send({ error: 'Name and city are required for first-time profile creation' });
        }

        const [newProfile] = await app.db
          .insert(schema.profiles)
          .values({
            userId: session.user.id,
            name,
            city,
          })
          .returning();

        app.logger.info({ userId: session.user.id }, 'Profile created successfully');
        return newProfile;
      }
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to update profile');
      return reply.status(500).send({ error: 'Failed to update profile' });
    }
  });
}
