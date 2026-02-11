import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { GERMAN_CITIES } from '../cities.js';

// Validation helper for cities
function validateCity(city: string): boolean {
  return GERMAN_CITIES.some(c => c.toLowerCase() === city.toLowerCase());
}

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
            photoUrl: { type: 'string', nullable: true },
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
  // Note: name is read-only after profile creation and cannot be updated
  app.fastify.put('/api/profile', {
    schema: {
      description: 'Update or create user profile (name is read-only)',
      tags: ['profile'],
      body: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          photoUrl: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            name: { type: 'string' },
            city: { type: 'string' },
            photoUrl: { type: 'string', nullable: true },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { city, photoUrl } = request.body as { city?: string; photoUrl?: string };

    app.logger.info({ userId: session.user.id, city, hasPhoto: !!photoUrl }, 'Updating user profile');

    try {
      // Validate city if provided
      if (city && !validateCity(city)) {
        app.logger.warn({ city }, 'Invalid city provided');
        return reply.status(400).send({ error: 'Invalid city. Must be from predefined list.' });
      }

      // Check if profile exists
      const existingProfile = await app.db.query.profiles.findFirst({
        where: eq(schema.profiles.userId, session.user.id),
      });

      if (existingProfile) {
        // Update existing profile
        const updateData: any = { updatedAt: new Date() };
        // Name is read-only - never update it
        if (city !== undefined) updateData.city = city;
        if (photoUrl !== undefined) updateData.photoUrl = photoUrl;

        const [updated] = await app.db
          .update(schema.profiles)
          .set(updateData)
          .where(eq(schema.profiles.userId, session.user.id))
          .returning();

        app.logger.info({ userId: session.user.id }, 'Profile updated successfully');
        return updated;
      } else {
        // Create new profile - requires city (name comes from auth user)
        if (!city) {
          app.logger.warn({ userId: session.user.id }, 'City required for profile creation');
          return reply.status(400).send({ error: 'City is required for profile creation' });
        }

        if (!validateCity(city)) {
          app.logger.warn({ city }, 'Invalid city for profile creation');
          return reply.status(400).send({ error: 'Invalid city. Must be from predefined list.' });
        }

        // Use name from authenticated user session
        const [newProfile] = await app.db
          .insert(schema.profiles)
          .values({
            userId: session.user.id,
            name: session.user.name || 'User',
            city,
            photoUrl: photoUrl || null,
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
