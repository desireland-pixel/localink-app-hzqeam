import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import { resend } from '@specific-dev/framework';

function formatDateForEmail(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function registerUserDeletionRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/user/delete-account - Schedule account deletion
  app.fastify.post('/api/user/delete-account', {
    schema: {
      description: 'Schedule account deletion for 7 days from now',
      tags: ['user'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    app.logger.info({ userId }, 'User requested account deletion');

    try {
      // Check if deletion is already scheduled
      const user = await app.db.query.user.findFirst({
        where: eq(authSchema.user.id, userId),
      });

      if (!user) {
        app.logger.warn({ userId }, 'User not found');
        return reply.status(404).send({ error: 'User not found' });
      }

      if (user.scheduledDeletionAt) {
        app.logger.warn({ userId }, 'Account deletion already scheduled');
        return reply.status(400).send({ error: 'Account deletion already scheduled' });
      }

      // Calculate deletion date (7 days from now)
      const now = new Date();
      const deletionDate = new Date(now);
      deletionDate.setDate(deletionDate.getDate() + 7);

      // Update user with deletion timestamps
      await app.db
        .update(authSchema.user)
        .set({
          scheduledDeletionAt: deletionDate,
          deletionRequestedAt: now,
        })
        .where(eq(authSchema.user.id, userId));

      // Note: Don't delete sessions - user should still be able to cancel deletion

      app.logger.info(
        { userId, deletionDate: deletionDate.toISOString() },
        'Account scheduled for deletion'
      );

      // Send confirmation email
      const formattedDate = formatDateForEmail(deletionDate);
      resend.emails.send({
        from: 'LokaLinc <noreply@lokalinc.de>',
        to: user.email,
        subject: 'Your LokaLinc account has been scheduled for deletion',
        html: `
          <p>Hi ${user.name},</p>
          <p>We've received your request to delete your LokaLinc account.</p>
          <p>Your account and all associated data will be <strong>permanently deleted on ${formattedDate}</strong> — 7 days from now.</p>
          <p>During this 7-day window, your data is retained for legal and compliance reasons. No action is needed from you.</p>
          <p>If this was a mistake, please contact our support team at <a href="mailto:support@lokalinc.de">support@lokalinc.de</a> as soon as possible.</p>
          <p>Thank you for being part of the LokaLinc community.</p>
          <p>— The LokaLinc Team</p>
					<p>- https://lokalinc.de</p>
        `,
      });

      app.logger.info({ userId, userEmail: user.email }, 'Deletion confirmation email sent');

      return { success: true, message: 'Account scheduled for deletion' };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to schedule account deletion');
      throw error;
    }
  });

  // POST /api/user/cancel-delete-account - Cancel scheduled deletion
  app.fastify.post('/api/user/cancel-delete-account', {
    schema: {
      description: 'Cancel scheduled account deletion',
      tags: ['user'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    app.logger.info({ userId }, 'User requested to cancel account deletion');

    try {
      // Check if deletion is scheduled
      const user = await app.db.query.user.findFirst({
        where: eq(authSchema.user.id, userId),
      });

      if (!user) {
        app.logger.warn({ userId }, 'User not found');
        return reply.status(404).send({ error: 'User not found' });
      }

      if (!user.scheduledDeletionAt) {
        app.logger.warn({ userId }, 'No deletion scheduled');
        return reply.status(400).send({ error: 'No deletion scheduled' });
      }

      // Clear deletion timestamps
      await app.db
        .update(authSchema.user)
        .set({
          scheduledDeletionAt: null,
          deletionRequestedAt: null,
        })
        .where(eq(authSchema.user.id, userId));

      app.logger.info({ userId }, 'Account deletion cancelled');

      return { success: true, message: 'Account deletion cancelled' };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to cancel account deletion');
      throw error;
    }
  });
}
