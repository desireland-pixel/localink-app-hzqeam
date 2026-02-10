import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

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
}
