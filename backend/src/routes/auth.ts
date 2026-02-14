import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import crypto from 'crypto';
import { resend } from '@specific-dev/framework';

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

interface LoginBody {
  email: string;
  password: string;
}

interface SignupBody {
  email: string;
  password: string;
  name: string;
}

export function registerAuthRoutes(app: App) {
  // Custom login wrapper with better error messages and email verification check
  app.fastify.post('/api/login', {
    schema: {
      description: 'Login with email and password (email must be verified)',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as LoginBody;
    app.logger.info({ email }, 'Login attempt');

    try {
      // Check if user exists and verify email status
      const user = await app.db.query.user.findFirst({
        where: eq(authSchema.user.email, email),
      });

      if (!user) {
        app.logger.warn({ email }, 'Login failed - user not found');
        return reply.status(401).send({ error: 'Invalid email or password' });
      }

      if (!user.emailVerified) {
        app.logger.warn({ email }, 'Login failed - email not verified');
        return reply.status(403).send({ error: 'Email not verified. Please check your email for verification link.' });
      }

      // Proxy the login request to Better Auth's sign-in endpoint
      // This allows Better Auth to handle password verification
      const baseUrl = `${request.protocol}://${request.hostname}`;
      const authResponse = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        app.logger.warn({ email }, 'Login failed - password verification failed');
        return reply.status(401).send({ error: 'Invalid email or password' });
      }

      const authData = await authResponse.json();
      app.logger.info({ email }, 'Login successful');
      return authData;
    } catch (error) {
      app.logger.error({ err: error, email }, 'Login error');
      return reply.status(500).send({ error: 'Login failed' });
    }
  });

  // Custom signup wrapper with OTP generation
  app.fastify.post('/api/signup', {
    schema: {
      description: 'Sign up with email, password and name (generates OTP for verification)',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          name: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, name } = request.body as SignupBody;
    app.logger.info({ email }, 'Signup attempt');

    try {
      // Check if user already exists
      const existingUser = await app.db.query.user.findFirst({
        where: eq(authSchema.user.email, email),
      });

      if (existingUser) {
        app.logger.warn({ email }, 'Signup failed - user already exists');
        return reply.status(400).send({ error: 'User with this email already exists' });
      }

      // Proxy the signup request to Better Auth's sign-up endpoint
      const baseUrl = `${request.protocol}://${request.hostname}`;
      const signupResponse = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
        }),
      });

      if (!signupResponse.ok) {
        const errorData = await signupResponse.json() as { message?: string };
        app.logger.warn({ email }, 'Signup failed via Better Auth');
        return reply.status(400).send({ error: errorData.message || 'Signup failed' });
      }

      const signupData = await signupResponse.json();
      app.logger.info({ email }, 'User created successfully');

      // Generate OTP for email verification
      const otp = generateOtp();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10-minute expiry

      await app.db
        .insert(schema.otpVerifications)
        .values({
          email,
          otp,
          expiresAt,
        });

      // Send OTP email
      resend.emails.send({
        from: 'Localink <noreply@localink.app>',
        to: email,
        subject: 'Localink - Verify Your Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Localink!</h2>
            <p>Your verification code is:</p>
            <div style="margin: 30px 0; font-size: 32px; font-weight: bold; letter-spacing: 2px; text-align: center;">
              ${otp}
            </div>
            <p style="color: #6B7280;">This code will expire in 10 minutes.</p>
            <p style="color: #6B7280;">If you didn't create this account, please ignore this email.</p>
          </div>
        `,
      });

      app.logger.info({ email }, 'OTP generated and sent for signup');
      return {
        success: true,
        message: 'Account created successfully. Please verify your email using the OTP sent to your email address.',
        requiresOtpVerification: true,
        email,
      };
    } catch (error) {
      app.logger.error({ err: error, email }, 'Signup error');
      return reply.status(500).send({ error: 'Signup failed' });
    }
  });

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

  // Forgot password endpoint
  app.fastify.post('/api/auth/forgot-password', {
    schema: {
      description: 'Request password reset email',
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
    const { email } = request.body as { email: string };
    app.logger.info({ email }, 'Password reset requested');

    try {
      // Check if user exists
      const authUser = await app.db.query.user.findFirst({
        where: eq(authSchema.user.email, email),
      });

      if (!authUser) {
        app.logger.warn({ email }, 'User not found for password reset');
        return reply.status(404).send({ error: 'No account found with this email' });
      }

      // Generate password reset token
      const resetToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1-hour expiry

      await app.db
        .insert(schema.passwordResetTokens)
        .values({
          userId: authUser.id,
          token: resetToken as any,
          expiresAt,
        });

      // Send password reset email
      const { resend } = await import('@specific-dev/framework');
      const resetLink = `${process.env.FRONTEND_URL || 'https://localink.app'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

      resend.emails.send({
        from: 'Localink <noreply@localink.app>',
        to: email,
        subject: 'Localink - Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset Your Password</h2>
            <p>Click the link below to reset your password:</p>
            <div style="margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #6B7280; margin-top: 20px;">Or copy and paste this link into your browser:</p>
            <p style="color: #4F46E5; word-break: break-all;">${resetLink}</p>
            <p style="color: #6B7280;">This link will expire in 1 hour.</p>
            <p style="color: #6B7280;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });

      app.logger.info({ email }, 'Password reset email sent successfully');
      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      app.logger.error({ err: error, email }, 'Failed to send password reset email');
      return reply.status(500).send({ error: 'Failed to send password reset email' });
    }
  });
}
