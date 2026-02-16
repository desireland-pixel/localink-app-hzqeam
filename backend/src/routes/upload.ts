import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerUploadRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Upload images
  app.fastify.post('/api/upload/images', {
    schema: {
      description: 'Upload images (max 5)',
      tags: ['upload'],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Uploading images');

    try {
      const parts = request.files({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB per file
      const uploadedUrls: string[] = [];

      for await (const part of parts) {
        if (uploadedUrls.length >= 5) break;

        try {
          // Convert file stream to buffer
          const buffer = await part.toBuffer();

          // Use framework's storage (S3/cloud storage)
          const key = `${session.user.id}/${Date.now()}-${part.filename}`;
          await app.storage.upload(key, buffer);

          // Generate signed URL for access
          const { url } = await app.storage.getSignedUrl(key);
          uploadedUrls.push(url);

          app.logger.info({ userId: session.user.id, filename: part.filename }, 'Image uploaded');
        } catch (uploadError) {
          app.logger.warn({ err: uploadError, userId: session.user.id }, 'Failed to upload individual image');
          // Continue with next image if one fails
        }
      }

      if (uploadedUrls.length === 0) {
        app.logger.warn({ userId: session.user.id }, 'No images uploaded');
        return reply.status(400).send({ error: 'No images provided' });
      }

      app.logger.info({ userId: session.user.id, count: uploadedUrls.length }, 'Images uploaded successfully');
      return { urls: uploadedUrls };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to upload images');
      return reply.status(500).send({ error: 'Failed to upload images' });
    }
  });

  // Upload profile photo
  app.fastify.post('/api/upload/profile-photo', {
    schema: {
      description: 'Upload profile photo and update user profile',
      tags: ['upload'],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Uploading profile photo');

    try {
      const data = await request.file();

      if (!data) {
        app.logger.warn({ userId: session.user.id }, 'No photo provided');
        return reply.status(400).send({ error: 'No photo provided' });
      }

      // Check file size (5MB limit)
      const buffer = await data.toBuffer();
      const fileSizeMB = buffer.length / (1024 * 1024);

      if (fileSizeMB > 5) {
        app.logger.warn({ userId: session.user.id, sizeMB: fileSizeMB }, 'Photo size exceeds limit');
        return reply.status(400).send({ error: 'Photo size should be less than 5 mb' });
      }

      // Upload to storage
      const key = `profile-photos/${session.user.id}/${Date.now()}-${data.filename}`;
      await app.storage.upload(key, buffer);

      // Generate signed URL
      const { url } = await app.storage.getSignedUrl(key);

      // Update user profile with photo URL
      await app.db
        .update(schema.profiles)
        .set({ photoUrl: url, updatedAt: new Date() })
        .where(eq(schema.profiles.userId, session.user.id));

      app.logger.info({ userId: session.user.id, photoUrl: url }, 'Profile photo uploaded successfully');
      return { url };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to upload profile photo');
      return reply.status(500).send({ error: 'Failed to upload profile photo' });
    }
  });
}
