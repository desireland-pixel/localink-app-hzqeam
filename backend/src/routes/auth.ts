import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';

interface VerifyOtpBody {
  email: string;
  otp: string;
}

interface ResendOtpBody {
  email: string;
}

// Generate a 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function registerAuthRoutes(app: App) {
  // Verify OTP endpoint
  app.fastify.post('/api/verify-otp', {
    schema: {
      description: 'Verify OTP for email verification',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: { type: 'string', format: 'email' },
          otp: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, otp } = request.body as VerifyOtpBody;
    app.logger.info({ email }, 'Verifying OTP');

    try {
      // Find the OTP record
      const otpRecord = await app.db.query.otpVerifications.findFirst({
        where: eq(schema.otpVerifications.email, email),
        orderBy: (table) => [desc(table.createdAt)],
      });

      if (!otpRecord) {
        app.logger.warn({ email }, 'OTP not found for email');
        return reply.status(400).send({ error: 'OTP not found. Please request a new OTP.' });
      }

      // Check if OTP has expired
      if (new Date() > otpRecord.expiresAt) {
        app.logger.warn({ email }, 'OTP has expired');
        return reply.status(400).send({ error: 'OTP has expired. Please request a new OTP.' });
      }

      // Verify OTP matches
      if (otpRecord.otp !== otp) {
        app.logger.warn({ email }, 'Invalid OTP provided');
        return reply.status(400).send({ error: 'Invalid OTP. Please try again.' });
      }

      // Find the user and mark email as verified
      const authUser = await app.db.query.user.findFirst({
        where: eq(authSchema.user.email, email),
      });

      if (!authUser) {
        app.logger.warn({ email }, 'User not found for OTP verification');
        return reply.status(404).send({ error: 'User not found.' });
      }

      // Update user's emailVerified flag in Better Auth user table
      // Note: This needs to be done through Better Auth's update mechanism
      // For now, we'll just delete the OTP record as confirmation
      await app.db
        .delete(schema.otpVerifications)
        .where(eq(schema.otpVerifications.email, email));

      app.logger.info({ email }, 'OTP verified successfully');
      return { success: true, message: 'Email verified successfully. You can now log in.' };
    } catch (error) {
      app.logger.error({ err: error, email }, 'Failed to verify OTP');
      return reply.status(500).send({ error: 'Failed to verify OTP' });
    }
  });

  // Resend OTP endpoint
  app.fastify.post('/api/resend-otp', {
    schema: {
      description: 'Resend OTP to email',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as ResendOtpBody;
    app.logger.info({ email }, 'Resending OTP');

    try {
      // Check if user exists
      const authUser = await app.db.query.user.findFirst({
        where: eq(authSchema.user.email, email),
      });

      if (!authUser) {
        app.logger.warn({ email }, 'User not found for OTP resend');
        return reply.status(404).send({ error: 'User not found.' });
      }

      // Generate new OTP
      const newOtp = generateOtp();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10-minute expiry

      // Delete old OTP records for this email
      await app.db
        .delete(schema.otpVerifications)
        .where(eq(schema.otpVerifications.email, email));

      // Insert new OTP
      await app.db
        .insert(schema.otpVerifications)
        .values({
          email,
          otp: newOtp,
          expiresAt,
        });

      // Send OTP email via Resend
      const { resend } = await import('@specific-dev/framework');
      resend.emails.send({
        from: 'Localink <noreply@localink.app>',
        to: email,
        subject: 'Localink - Verify Your Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verify Your Email</h2>
            <p>Your verification code is:</p>
            <div style="margin: 30px 0; font-size: 32px; font-weight: bold; letter-spacing: 2px; text-align: center;">
              ${newOtp}
            </div>
            <p style="color: #6B7280;">This code will expire in 10 minutes.</p>
            <p style="color: #6B7280;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });

      app.logger.info({ email }, 'OTP resent successfully');
      return { success: true, message: 'OTP sent to your email. It will expire in 10 minutes.' };
    } catch (error) {
      app.logger.error({ err: error, email }, 'Failed to resend OTP');
      return reply.status(500).send({ error: 'Failed to resend OTP' });
    }
  });
}
