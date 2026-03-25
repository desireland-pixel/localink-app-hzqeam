import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import crypto from 'crypto';
import { resend, APIError } from '@specific-dev/framework';

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
  rememberMe?: boolean;
}

interface SignupBody {
  email: string;
  password: string;
  name: string;
  username: string;
  city: string;
  termsAccepted: boolean;
}

export function registerAuthRoutes(app: App) {
  // Custom login wrapper with better error messages and email verification check
  app.fastify.post('/api/login', {
    schema: {
      description: 'Login with email and password (email must be verified). Optional rememberMe to extend session to 90 days.',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          rememberMe: { type: 'boolean' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, rememberMe } = request.body as LoginBody;
    app.logger.info({ email }, 'Login attempt');

    try {
      // Check if user exists and verify email status
      const user = await app.db.query.user.findFirst({
        where: eq(authSchema.user.email, email),
      });

      if (!user) {
        app.logger.warn({ email }, 'Login failed - user not found');
        return reply.status(404).send({ error: 'Account does not exist, Sign Up' });
      }

      // For testing: allow test user accounts to bypass email verification
      const isTestUser = email.includes('testuser+');

      if (!user.emailVerified && !isTestUser) {
        app.logger.warn({ email }, 'Login failed - email not verified');
        return reply.status(403).send({ error: 'Please verify your email.' });
      }

      // Use Better Auth API to sign in
      const result = await app.auth.api.signInEmail({
        body: { email, password },
        returnHeaders: true,
      });

      app.logger.info({ email, rememberMe }, 'Login successful');

      // If rememberMe is true, set extended session cookie (90 days)
      if (rememberMe && result.headers) {
        const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
        const setCookieHeaders = Array.from(result.headers.getSetCookie?.() || []);

        for (const setCookieHeader of setCookieHeaders) {
          if (setCookieHeader.includes('session')) {
            // Update the cookie string with new max-age for 90 days
            const updatedCookie = setCookieHeader.replace(/Max-Age=[^;]+/, `Max-Age=${ninetyDaysMs / 1000}`);
            reply.header('Set-Cookie', updatedCookie);
            app.logger.info({ email }, 'Extended session cookie set for 90 days');
          } else {
            reply.header('Set-Cookie', setCookieHeader);
          }
        }
      } else if (result.headers) {
        // Copy original Set-Cookie headers
        const setCookieHeaders = Array.from(result.headers.getSetCookie?.() || []);
        for (const setCookieHeader of setCookieHeaders) {
          reply.header('Set-Cookie', setCookieHeader);
        }
      }

      // Return user data and auth response
      return result.response;
    } catch (error) {
      if (error instanceof APIError) {
        app.logger.warn({ email, errorCode: error.statusCode }, 'Login failed - authentication error');
        return reply.status(error.statusCode).send({ error: error.message });
      }
      app.logger.error({ err: error, email }, 'Login error');
      return reply.status(500).send({ error: 'Login failed' });
    }
  });

  // Custom signup wrapper with OTP generation
  app.fastify.post('/api/signup', {
    schema: {
      description: 'Sign up with email, password, name, username, and city (generates OTP for verification)',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password', 'name', 'username', 'city', 'termsAccepted'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          name: { type: 'string' },
          username: { type: 'string' },
          city: { type: 'string' },
          termsAccepted: { type: 'boolean' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, name, username, city, termsAccepted } = request.body as SignupBody;
    app.logger.info({ email, name, username, city }, 'Signup attempt');

    // Validate all required fields
    if (!email || !password || !name || !username || !city || !termsAccepted) {
      app.logger.warn({ email }, 'Signup failed - missing required fields or terms not accepted');
      return reply.status(400).send({ error: 'All fields are required and terms must be accepted' });
    }

    try {
      // Check if user already exists
      const existingUser = await app.db.query.user.findFirst({
        where: eq(authSchema.user.email, email),
      });

      let userId: string;

      if (existingUser) {
        // If email exists but is not verified, allow retry
        if (existingUser.emailVerified) {
          app.logger.warn({ email }, 'Signup failed - user already exists and email is verified');
          return reply.status(400).send({ error: 'User with this email already exists' });
        }
        // Email exists but not verified - allow retry with same email
        app.logger.info({ email, userId: existingUser.id }, 'Retrying signup with unverified email');
        userId = existingUser.id;
      } else {
        // Check if username already exists (case-insensitive)
        const existingUsername = await app.db.query.profiles.findFirst({
          where: eq(schema.profiles.username, username.toLowerCase()),
        });

        if (existingUsername) {
          app.logger.warn({ username }, 'Signup failed - username already exists');
          return reply.status(400).send({ error: 'Username already exists' });
        }

        // Use Better Auth API to sign up
        try {
          const signupResult = await app.auth.api.signUpEmail({
            body: { email, password, name },
          });

          userId = signupResult.user.id;
          app.logger.info({ email, userId }, 'User created successfully');
        } catch (authError) {
          if (authError instanceof APIError) {
            app.logger.warn({ email, errorCode: authError.statusCode }, 'Signup failed - Better Auth error');
            return reply.status(authError.statusCode).send({ error: authError.message });
          }
          throw authError;
        }
      }

      // Create or update profile with username and city from signup
      try {
        const existingProfile = await app.db.query.profiles.findFirst({
          where: eq(schema.profiles.userId, userId),
        });

        if (existingProfile) {
          // Update existing profile
          await app.db
            .update(schema.profiles)
            .set({
              username: username.toLowerCase(),
              city: city,
              updatedAt: new Date(),
            })
            .where(eq(schema.profiles.userId, userId));
          app.logger.info({ userId, username, city }, 'Profile updated during signup retry');
        } else {
          // Create new profile
          await app.db
            .insert(schema.profiles)
            .values({
              userId,
              name: name,
              username: username.toLowerCase(),
              city: city,
              photoUrl: null,
            });
          app.logger.info({ userId, username, city }, 'Profile created during signup');
        }
      } catch (profileError) {
        app.logger.error({ err: profileError, userId }, 'Failed to create/update profile during signup');
        // Continue with OTP generation even if profile creation/update fails
      }

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

      app.logger.info({ email }, 'OTP generated');

      // Send OTP email (fire and forget)
      resend.emails.send({
        from: 'LokaLinc <noreply@lokalinc.de>',
        to: email,
        subject: 'LokaLinc - Verify Your Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to LokaLinc!</h2>
            <p>Your verification code is:</p>
            <div style="margin: 30px 0; font-size: 32px; font-weight: bold; letter-spacing: 2px; text-align: center;">
              ${otp}
            </div>
            <p style="color: #6B7280;">This code will expire in 10 minutes.</p>
            <p style="color: #6B7280;">If you didn't create this account, please ignore this email.</p>
          </div>
        `,
      });

      app.logger.info({ email }, 'OTP email sent for signup');
      return {
        success: true,
        message: 'Account created successfully. Please verify your email using the OTP sent to your email address.',
        requiresOtpVerification: true,
        email,
      };
    } catch (error) {
      app.logger.error({ err: error, email }, 'Signup error');
      return reply.status(500).send({ error: 'Failed to create account. Please try again.' });
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
      await app.db
        .update(authSchema.user)
        .set({ emailVerified: true })
        .where(eq(authSchema.user.email, email));

      // Check if profile already exists
      const existingProfile = await app.db.query.profiles.findFirst({
        where: eq(schema.profiles.userId, authUser.id),
      });

      // If profile doesn't exist, create it with name from auth user
      if (!existingProfile) {
        app.logger.info({ userId: authUser.id }, 'Profile does not exist after signup, it should have been created');
      }

      // Delete the OTP record after successful verification
      await app.db
        .delete(schema.otpVerifications)
        .where(eq(schema.otpVerifications.email, email));

      app.logger.info({ email, userId: authUser.id }, 'OTP verified and email marked as verified');
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
        from: 'LokaLinc <noreply@lokalinc.de>',
        to: email,
        subject: 'LokaLinc - Verify Your Email',
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
      const resetLink = `${'https://lokalinc.de'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

      resend.emails.send({
        from: 'LokaLinc <noreply@lokalinc.de>',
        to: email,
        subject: 'LokaLinc - Reset Your Password',
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
            <p style="color: #6B7280;">This link will expire in 10 minutes.</p>
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

  // Terms and Conditions endpoint
  app.fastify.get('/api/terms-and-conditions', {
    schema: {
      description: 'Get Terms and Conditions content',
      tags: ['auth'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({}, 'Fetching Terms and Conditions');
    return {
      content: `
        <strong>Terms and Conditions</strong><br/>
        Last updated: ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}<br/><br/>
        
        <strong>1. Scope</strong><br/>
        These Terms govern the use of the LokaLinc platform. By registering or using the platform, users agree to these Terms.<br/><br/>
        
        <strong>2. Platform Nature</strong><br/>
        LokaLinc is a digital platform enabling users to connect for housing sublet, travel coordination, and community interaction.<br/>
        LokaLinc is not:<br/>
        • A rental provider<br/>
        • A logistics company<br/>
        • A courier service<br/>
        • A payment processor<br/>
        • A contracting party to agreements between users<br/>
        All agreements are concluded exclusively between users.<br/><br/>
        
        <strong>3. Sublet Listings</strong><br/>
        Users are solely responsible for compliance with applicable rental laws, including obtaining any required landlord consent. No responsibility is assumed for legality, accuracy, or fulfillment of subletting arrangements.<br/><br/>
        
        <strong>4. Travel and Item Transport</strong><br/>
        Users are solely responsible for compliance with customs laws, airline regulations, and all applicable legal requirements.<br/>
        The transport of illegal, restricted, dangerous, or commercial goods is strictly prohibited.<br/>
        No verification, transport, insurance, or liability is assumed for items exchanged between users.<br/><br/>
        
        <strong>5. User Content</strong><br/>
        Users are responsible for the content they publish. Content must not violate applicable law or third-party rights. We reserve the right to remove content or suspend accounts.<br/><br/>
        
        <strong>6. Liability Limitation</strong><br/>
        LokaLinc shall only be liable for damages caused by intent or gross negligence, except where mandatory statutory provisions apply. No liability is assumed for agreements concluded between users.<br/><br/>
        
        <strong>7. Account Termination</strong><br/>
        Accounts may be suspended or terminated for violations of these Terms. Users may request account deletion at any time.<br/><br/>
        
        <strong>8. Governing Law</strong><br/>
        These Terms are governed by the laws of the Federal Republic of Germany.
      `
    };
  });

  // Check if username is available
  app.fastify.get('/api/check-username', {
    schema: {
      description: 'Check if a username is available',
      tags: ['auth'],
      querystring: {
        type: 'object',
        required: ['username'],
        properties: {
          username: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            available: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { username } = request.query as { username: string };
    app.logger.info({ username }, 'Checking username availability');

    try {
      if (!username || username.trim().length === 0) {
        app.logger.warn({}, 'Username check failed - username is empty');
        return reply.status(400).send({ error: 'Username is required' });
      }

      // Check if username already exists (case-insensitive)
      const existingUsername = await app.db.query.profiles.findFirst({
        where: eq(schema.profiles.username, username.toLowerCase()),
      });

      if (existingUsername) {
        app.logger.info({ username }, 'Username already exists');
        return { available: false, message: 'Username already exists' };
      }

      app.logger.info({ username }, 'Username is available');
      return { available: true };
    } catch (error) {
      app.logger.error({ err: error, username }, 'Failed to check username availability');
      return reply.status(500).send({ error: 'Failed to check username availability' });
    }
  });
}
