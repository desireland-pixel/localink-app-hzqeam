import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
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
            username: { type: 'string', nullable: true },
            email: { type: 'string' },
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

    // Check profile completion: needs username, city, AND gdprConsentAccepted
    const isProfileComplete = !!(profile.username && profile.city && profile.gdprConsentAccepted);

    return {
      ...profile,
      userId: profile.userId,
      email: session.user.email,
      isProfileComplete,
    };
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
          name: { type: 'string' },
          username: { type: 'string' },
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
            username: { type: 'string', nullable: true },
            email: { type: 'string' },
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

    const { name, username, city, photoUrl, gdprConsentAccepted } = request.body as { name?: string; username?: string; city?: string; photoUrl?: string; gdprConsentAccepted?: boolean };

    app.logger.info({ userId: session.user.id, username, city, hasPhoto: !!photoUrl, gdprConsentAccepted }, 'Updating user profile');

    try {
      // Validate city if provided
      if (city && !validateCity(city)) {
        app.logger.warn({ city }, 'Invalid city provided');
        return reply.status(400).send({ error: 'Invalid city. Must be from predefined list.' });
      }

      // Check if username is already taken (if provided and different from current)
      if (username) {
        const existingUsername = await app.db.query.profiles.findFirst({
          where: eq(schema.profiles.username, username),
        });
        if (existingUsername && existingUsername.userId !== session.user.id) {
          app.logger.warn({ username }, 'Username already taken');
          return reply.status(400).send({ error: 'Username already taken' });
        }
      }

      // Check if profile exists
      const existingProfile = await app.db.query.profiles.findFirst({
        where: eq(schema.profiles.userId, session.user.id),
      });

      if (existingProfile) {
        // Update existing profile
        const updateData: any = { updatedAt: new Date() };
        // Name is read-only - never update it
        if (username !== undefined) updateData.username = username || null;
        if (city !== undefined) updateData.city = city;
        if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
        if (gdprConsentAccepted !== undefined) {
          updateData.gdprConsentAccepted = gdprConsentAccepted;
          if (gdprConsentAccepted) {
            updateData.gdprConsentAcceptedAt = new Date();
          }
        }

        const [updated] = await app.db
          .update(schema.profiles)
          .set(updateData)
          .where(eq(schema.profiles.userId, session.user.id))
          .returning();

        // Check if profile is now complete (has username, city, AND gdprConsentAccepted)
        const isProfileComplete = !!(updated.username && updated.city && updated.gdprConsentAccepted);

        // Update profile_completed flag in auth user if profile is now complete
        if (isProfileComplete) {
          await app.db
            .update(authSchema.user)
            .set({ profileCompleted: true })
            .where(eq(authSchema.user.id, session.user.id));
        }

        app.logger.info({ userId: session.user.id, profileComplete: isProfileComplete }, 'Profile updated successfully');
        return {
          ...updated,
          email: session.user.email,
          profileCompleted: isProfileComplete,
        };
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
            username: username || null,
            city,
            photoUrl: photoUrl || null,
            gdprConsentAccepted: gdprConsentAccepted || false,
            gdprConsentAcceptedAt: gdprConsentAccepted ? new Date() : null,
          })
          .returning();

        // Check if profile is complete (has username, city, AND gdprConsentAccepted)
        const isProfileComplete = !!(newProfile.username && newProfile.city && newProfile.gdprConsentAccepted);

        // Update profile_completed flag in auth user if profile is complete
        if (isProfileComplete) {
          await app.db
            .update(authSchema.user)
            .set({ profileCompleted: true })
            .where(eq(authSchema.user.id, session.user.id));
        }

        app.logger.info({ userId: session.user.id, profileComplete: isProfileComplete }, 'Profile created successfully');
        return {
          ...newProfile,
          email: session.user.email,
          profileCompleted: isProfileComplete,
        };
      }
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to update profile');
      return reply.status(500).send({ error: 'Failed to update profile' });
    }
  });

  // Change password
  app.fastify.put('/api/profile/change-password', {
    schema: {
      description: 'Change user password',
      tags: ['profile'],
      body: {
        type: 'object',
        required: ['oldPassword', 'newPassword'],
        properties: {
          oldPassword: { type: 'string' },
          newPassword: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { oldPassword, newPassword } = request.body as { oldPassword: string; newPassword: string };

    app.logger.info({ userId: session.user.id }, 'Changing password');

    try {
      // Get user account to verify old password
      const account = await app.db.query.account.findFirst({
        where: (field) => eq(field.userId, session.user.id),
      });

      if (!account || !account.password) {
        app.logger.warn({ userId: session.user.id }, 'User account not found or password not set');
        return reply.status(400).send({ error: 'Password not set for this account' });
      }

      // Verify old password using Better Auth's password verification
      // Since we can't access bcrypt directly, we'll use the auth change-password endpoint
      // by proxying through it
      const baseUrl = `${request.protocol}://${request.hostname}`;
      const response = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.cookie || '',
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        app.logger.warn({ userId: session.user.id, status: response.status }, 'Password change failed');
        if (response.status === 400) {
          return reply.status(401).send({ error: 'Current password is incorrect' });
        }
        return reply.status(500).send({ error: 'Failed to change password' });
      }

      app.logger.info({ userId: session.user.id }, 'Password changed successfully');
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to change password');
      return reply.status(500).send({ error: 'Failed to change password' });
    }
  });

  // Accept GDPR consent
  app.fastify.post('/api/profile/gdpr/consent', {
    schema: {
      description: 'Accept GDPR consent and privacy terms',
      tags: ['profile'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Accepting GDPR consent');

    try {
      const profile = await app.db.query.profiles.findFirst({
        where: eq(schema.profiles.userId, session.user.id),
      });

      if (!profile) {
        app.logger.warn({ userId: session.user.id }, 'Profile not found');
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const [updated] = await app.db
        .update(schema.profiles)
        .set({
          gdprConsentAccepted: true,
          gdprConsentAcceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.profiles.userId, session.user.id))
        .returning();

      app.logger.info({ userId: session.user.id }, 'GDPR consent accepted');
      return { success: true, message: 'GDPR consent accepted' };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to accept GDPR consent');
      return reply.status(500).send({ error: 'Failed to accept consent' });
    }
  });

  // Request data deletion (GDPR Right to Deletion)
  app.fastify.post('/api/profile/gdpr/request-deletion', {
    schema: {
      description: 'Request account and data deletion (GDPR Right to Deletion)',
      tags: ['profile'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Data deletion requested');

    try {
      const profile = await app.db.query.profiles.findFirst({
        where: eq(schema.profiles.userId, session.user.id),
      });

      if (!profile) {
        app.logger.warn({ userId: session.user.id }, 'Profile not found');
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const [updated] = await app.db
        .update(schema.profiles)
        .set({
          dataDeleteRequestedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.profiles.userId, session.user.id))
        .returning();

      app.logger.info({ userId: session.user.id }, 'Data deletion request recorded');
      return {
        success: true,
        message: 'Data deletion request received. Your account will be deleted within 30 days as per GDPR regulations.',
      };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to process deletion request');
      return reply.status(500).send({ error: 'Failed to process deletion request' });
    }
  });

  // Get privacy/GDPR status
  app.fastify.get('/api/profile/gdpr/status', {
    schema: {
      description: 'Get GDPR consent and data deletion status',
      tags: ['profile'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching GDPR status');

    try {
      const profile = await app.db.query.profiles.findFirst({
        where: eq(schema.profiles.userId, session.user.id),
      });

      if (!profile) {
        app.logger.warn({ userId: session.user.id }, 'Profile not found');
        return reply.status(404).send({ error: 'Profile not found' });
      }

      return {
        gdprConsentAccepted: profile.gdprConsentAccepted,
        gdprConsentAcceptedAt: profile.gdprConsentAcceptedAt,
        dataDeleteRequested: !!profile.dataDeleteRequestedAt,
        dataDeleteRequestedAt: profile.dataDeleteRequestedAt,
        isDeleted: !!profile.dataDeletedAt,
      };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch GDPR status');
      return reply.status(500).send({ error: 'Failed to fetch GDPR status' });
    }
  });
}
