import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, asc, sql, count } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { generateShortId } from '../utils/short-id.js';
import { sendPushNotification } from '../utils/push-notifications.js';

interface DiscussionTopicFilters {
  category?: string;
  status?: 'open' | 'closed';
  limit?: string;
  offset?: string;
}

interface DiscussionTopicBody {
  category: string;
  location?: string;
  title: string;
  description?: string;
}

interface DiscussionReplyBody {
  content: string;
}

export function registerCommunityRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // List discussion topics with filters
  app.fastify.get('/api/community/topics', {
    schema: {
      description: 'List community discussion topics with optional filters',
      tags: ['community'],
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          status: { type: 'string', enum: ['open', 'closed'] },
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const filters = request.query as DiscussionTopicFilters;
    app.logger.info({ filters }, 'Listing discussion topics');

    try {
      const conditions: any[] = [];

      if (filters.category) {
        conditions.push(eq(schema.discussionTopics.category, filters.category));
      }

      if (filters.status) {
        conditions.push(eq(schema.discussionTopics.status, filters.status));
      }

      const limit = parseInt(filters.limit || '20');
      const offset = parseInt(filters.offset || '0');

      const topics = await app.db
        .select({
          id: schema.discussionTopics.id,
          userId: schema.discussionTopics.userId,
          category: schema.discussionTopics.category,
          location: schema.discussionTopics.location,
          title: schema.discussionTopics.title,
          description: schema.discussionTopics.description,
          status: schema.discussionTopics.status,
          unreadRepliesCount: schema.discussionTopics.unreadRepliesCount,
          replyCount: sql<number>`(SELECT COUNT(*) FROM ${schema.discussionReplies} WHERE ${schema.discussionReplies.topicId} = ${schema.discussionTopics.id})`,
          createdAt: schema.discussionTopics.createdAt,
          updatedAt: schema.discussionTopics.updatedAt,
          username: schema.profiles.username,
        })
        .from(schema.discussionTopics)
        .leftJoin(schema.profiles, eq(schema.discussionTopics.userId, schema.profiles.userId))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(schema.discussionTopics.createdAt));

      // Transform to include user object and formatted metadata
      const result = topics.map(topic => {
        const date = new Date(topic.createdAt);
        const formattedDate = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
        return {
          ...topic,
          shortId: generateShortId(topic.id),
          isOwner: false, // Set to false for list endpoint (frontend can determine based on userId)
          user: {
            id: topic.userId,
            username: topic.username || 'Unknown User',
          },
          username: undefined,
          byline: `by ${topic.username || 'Unknown User'} on ${formattedDate}`,
        };
      });

      app.logger.info({ count: result.length }, 'Discussion topics listed successfully');
      return result;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to list discussion topics');
      return reply.status(500).send({ error: 'Failed to list discussion topics' });
    }
  });

  // Get discussion topic by ID with replies
  app.fastify.get('/api/community/topics/:id', {
    schema: {
      description: 'Get discussion topic details with replies',
      tags: ['community'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const currentUserId = session.user.id;
    app.logger.info({ topicId: id, userId: currentUserId }, 'Fetching discussion topic details');

    try {
      const topicResult = await app.db
        .select({
          id: schema.discussionTopics.id,
          userId: schema.discussionTopics.userId,
          category: schema.discussionTopics.category,
          location: schema.discussionTopics.location,
          title: schema.discussionTopics.title,
          description: schema.discussionTopics.description,
          status: schema.discussionTopics.status,
          unreadRepliesCount: schema.discussionTopics.unreadRepliesCount,
          replyCount: sql<number>`(SELECT COUNT(*) FROM ${schema.discussionReplies} WHERE ${schema.discussionReplies.topicId} = ${schema.discussionTopics.id})`,
          createdAt: schema.discussionTopics.createdAt,
          updatedAt: schema.discussionTopics.updatedAt,
          username: schema.profiles.username,
        })
        .from(schema.discussionTopics)
        .leftJoin(schema.profiles, eq(schema.discussionTopics.userId, schema.profiles.userId))
        .where(eq(schema.discussionTopics.id, id))
        .limit(1);

      if (!topicResult || topicResult.length === 0) {
        app.logger.warn({ topicId: id }, 'Discussion topic not found');
        return reply.status(404).send({ error: 'Discussion topic not found' });
      }

      const topic = topicResult[0];

      // Fetch replies with like counts and like status for current user
      const replies = await app.db
        .select({
          id: schema.discussionReplies.id,
          topicId: schema.discussionReplies.topicId,
          userId: schema.discussionReplies.userId,
          content: schema.discussionReplies.content,
          isRead: schema.discussionReplies.isRead,
          createdAt: schema.discussionReplies.createdAt,
          updatedAt: schema.discussionReplies.updatedAt,
          username: schema.profiles.username,
          likes: sql<number>`(SELECT COUNT(*) FROM ${schema.replyLikes} WHERE ${schema.replyLikes.replyId} = ${schema.discussionReplies.id})`,
          isLikedByMe: sql<boolean>`EXISTS(SELECT 1 FROM ${schema.replyLikes} WHERE ${schema.replyLikes.replyId} = ${schema.discussionReplies.id} AND ${schema.replyLikes.userId} = ${currentUserId})`,
        })
        .from(schema.discussionReplies)
        .leftJoin(schema.profiles, eq(schema.discussionReplies.userId, schema.profiles.userId))
        .where(eq(schema.discussionReplies.topicId, id))
        .orderBy(schema.discussionReplies.createdAt);

      // Transform replies to include user object
      const transformedReplies = replies.map(reply => ({
        ...reply,
        user: {
          id: reply.userId,
          username: reply.username || 'Unknown User',
        },
        username: undefined,
      }));

      const response = {
        ...topic,
        shortId: generateShortId(topic.id),
        isOwner: topic.userId === currentUserId, // Topic owner flag
        user: {
          id: topic.userId,
          username: topic.username || 'Unknown User',
        },
        username: undefined,
        replies: transformedReplies,
      };

      app.logger.info({ topicId: id, shortId: response.shortId, repliesCount: transformedReplies.length }, 'Discussion topic details fetched successfully');
      return response;
    } catch (error) {
      app.logger.error({ err: error, topicId: id }, 'Failed to fetch discussion topic');
      return reply.status(500).send({ error: 'Failed to fetch discussion topic' });
    }
  });

  // Create discussion topic
  app.fastify.post('/api/community/topics', {
    schema: {
      description: 'Create a new discussion topic',
      tags: ['community'],
      body: {
        type: 'object',
        required: ['category', 'title'],
        properties: {
          category: { type: 'string' },
          location: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const body = request.body as DiscussionTopicBody;
    app.logger.info({ userId: session.user.id, body }, 'Creating discussion topic');

    try {
      const [topic] = await app.db
        .insert(schema.discussionTopics)
        .values({
          userId: session.user.id,
          category: body.category,
          location: body.location || 'Germany',
          title: body.title,
          description: body.description,
        })
        .returning();

      app.logger.info({ topicId: topic.id, userId: session.user.id }, 'Discussion topic created successfully');
      return topic;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to create discussion topic');
      return reply.status(500).send({ error: 'Failed to create discussion topic' });
    }
  });

  // Update discussion topic (owner or admin only)
  app.fastify.put('/api/community/topics/:id', {
    schema: {
      description: 'Update own discussion topic',
      tags: ['community'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          location: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['open', 'closed'] },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const body = request.body as Partial<DiscussionTopicBody & { status: 'open' | 'closed' }>;
    app.logger.info({ userId: session.user.id, topicId: id, body }, 'Updating discussion topic');

    try {
      const existing = await app.db.query.discussionTopics.findFirst({
        where: eq(schema.discussionTopics.id, id),
      });

      if (!existing) {
        app.logger.warn({ topicId: id }, 'Discussion topic not found');
        return reply.status(404).send({ error: 'Discussion topic not found' });
      }

      if (existing.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, topicId: id }, 'Unauthorized topic update attempt');
        return reply.status(403).send({ error: 'You can only update your own topics' });
      }

      const updateData: any = { updatedAt: new Date() };
      if (body.category !== undefined) updateData.category = body.category;
      if (body.location !== undefined) updateData.location = body.location;
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.status !== undefined) updateData.status = body.status;

      const [updated] = await app.db
        .update(schema.discussionTopics)
        .set(updateData)
        .where(eq(schema.discussionTopics.id, id))
        .returning();

      app.logger.info({ topicId: id, userId: session.user.id }, 'Discussion topic updated successfully');
      return updated;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, topicId: id }, 'Failed to update discussion topic');
      return reply.status(500).send({ error: 'Failed to update discussion topic' });
    }
  });

  // Create reply to a topic
  app.fastify.post('/api/community/topics/:id/replies', {
    schema: {
      description: 'Create a reply to a discussion topic',
      tags: ['community'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const body = request.body as DiscussionReplyBody;
    app.logger.info({ userId: session.user.id, topicId: id, body }, 'Creating discussion reply');

    try {
      // Check if topic exists
      const topic = await app.db.query.discussionTopics.findFirst({
        where: eq(schema.discussionTopics.id, id),
      });

      if (!topic) {
        app.logger.warn({ topicId: id }, 'Discussion topic not found');
        return reply.status(404).send({ error: 'Discussion topic not found' });
      }

      const [newReply] = await app.db
        .insert(schema.discussionReplies)
        .values({
          topicId: id,
          userId: session.user.id,
          content: body.content,
        })
        .returning();

      // Increment repliesCount on topic
      const newCount = (parseInt(topic.repliesCount.toString()) || 0) + 1;
      const updateData: any = { repliesCount: newCount.toString() };

      // Increment unreadRepliesCount if reply is from someone other than topic owner
      if (topic.userId !== session.user.id) {
        const newUnreadCount = (parseInt(topic.unreadRepliesCount.toString()) || 0) + 1;
        updateData.unreadRepliesCount = newUnreadCount.toString();
      }

      await app.db
        .update(schema.discussionTopics)
        .set(updateData)
        .where(eq(schema.discussionTopics.id, id));

      // Send push notification to topic author if different from reply author
      if (topic.userId !== session.user.id) {
        const replyAuthorProfile = await app.db.query.profiles.findFirst({
          where: eq(schema.profiles.userId, session.user.id),
        });

        sendPushNotification(app, {
          to: '',
          title: 'New reply to your post',
          body: body.content.substring(0, 100),
          data: {
            topicId: id,
          },
        }, topic.userId);
      }

      app.logger.info({ replyId: newReply.id, topicId: id, userId: session.user.id }, 'Discussion reply created successfully');
      return newReply;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, topicId: id }, 'Failed to create discussion reply');
      return reply.status(500).send({ error: 'Failed to create discussion reply' });
    }
  });

  // Update reply (owner only)
  app.fastify.put('/api/community/replies/:replyId', {
    schema: {
      description: 'Update own discussion reply',
      tags: ['community'],
      params: {
        type: 'object',
        properties: {
          replyId: { type: 'string', format: 'uuid' },
        },
        required: ['replyId'],
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { replyId } = request.params as { replyId: string };
    const body = request.body as DiscussionReplyBody;
    app.logger.info({ userId: session.user.id, replyId, body }, 'Updating discussion reply');

    try {
      const existing = await app.db.query.discussionReplies.findFirst({
        where: eq(schema.discussionReplies.id, replyId),
      });

      if (!existing) {
        app.logger.warn({ replyId }, 'Discussion reply not found');
        return reply.status(404).send({ error: 'Discussion reply not found' });
      }

      if (existing.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, replyId }, 'Unauthorized reply update attempt');
        return reply.status(403).send({ error: 'You can only update your own replies' });
      }

      const [updated] = await app.db
        .update(schema.discussionReplies)
        .set({ content: body.content, updatedAt: new Date() })
        .where(eq(schema.discussionReplies.id, replyId))
        .returning();

      app.logger.info({ replyId, userId: session.user.id }, 'Discussion reply updated successfully');
      return updated;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, replyId }, 'Failed to update discussion reply');
      return reply.status(500).send({ error: 'Failed to update discussion reply' });
    }
  });

  // Delete reply (owner only)
  app.fastify.delete('/api/community/replies/:replyId', {
    schema: {
      description: 'Delete own discussion reply',
      tags: ['community'],
      params: {
        type: 'object',
        properties: {
          replyId: { type: 'string', format: 'uuid' },
        },
        required: ['replyId'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { replyId } = request.params as { replyId: string };
    app.logger.info({ userId: session.user.id, replyId }, 'Deleting discussion reply');

    try {
      const existing = await app.db.query.discussionReplies.findFirst({
        where: eq(schema.discussionReplies.id, replyId),
      });

      if (!existing) {
        app.logger.warn({ replyId }, 'Discussion reply not found');
        return reply.status(404).send({ error: 'Discussion reply not found' });
      }

      if (existing.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, replyId }, 'Unauthorized reply delete attempt');
        return reply.status(403).send({ error: 'You can only delete your own replies' });
      }

      // Decrement repliesCount on topic
      const topic = await app.db.query.discussionTopics.findFirst({
        where: eq(schema.discussionTopics.id, existing.topicId),
      });

      if (topic) {
        const newCount = Math.max(0, (parseInt(topic.repliesCount.toString()) || 1) - 1);
        await app.db
          .update(schema.discussionTopics)
          .set({ repliesCount: newCount.toString() })
          .where(eq(schema.discussionTopics.id, existing.topicId));
      }

      await app.db
        .delete(schema.discussionReplies)
        .where(eq(schema.discussionReplies.id, replyId));

      app.logger.info({ replyId, userId: session.user.id }, 'Discussion reply deleted successfully');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, replyId }, 'Failed to delete discussion reply');
      return reply.status(500).send({ error: 'Failed to delete discussion reply' });
    }
  });

  // Get comments for a community post (alias for GET /api/community/topics/:id/replies)
  app.fastify.get('/api/community/:postId/comments', {
    schema: {
      description: 'Get comments for a community post',
      tags: ['community'],
      params: {
        type: 'object',
        properties: {
          postId: { type: 'string', format: 'uuid' },
        },
        required: ['postId'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { postId } = request.params as { postId: string };
    app.logger.info({ postId }, 'Fetching comments for community post');

    try {
      const replies = await app.db
        .select({
          id: schema.discussionReplies.id,
          topicId: schema.discussionReplies.topicId,
          userId: schema.discussionReplies.userId,
          content: schema.discussionReplies.content,
          createdAt: schema.discussionReplies.createdAt,
          updatedAt: schema.discussionReplies.updatedAt,
          username: schema.profiles.username,
        })
        .from(schema.discussionReplies)
        .leftJoin(schema.profiles, eq(schema.discussionReplies.userId, schema.profiles.userId))
        .where(eq(schema.discussionReplies.topicId, postId))
        .orderBy(desc(schema.discussionReplies.createdAt));

      // Transform to include user object
      const transformedReplies = replies.map(reply => ({
        ...reply,
        user: {
          id: reply.userId,
          username: reply.username || 'Unknown User',
        },
        username: undefined,
      }));

      app.logger.info({ postId, count: transformedReplies.length }, 'Comments fetched successfully');
      return transformedReplies;
    } catch (error) {
      app.logger.error({ err: error, postId }, 'Failed to fetch comments');
      return reply.status(500).send({ error: 'Failed to fetch comments' });
    }
  });

  // Add comment to a community post (alias for POST /api/community/topics/:id/replies)
  app.fastify.post('/api/community/:postId/comments', {
    schema: {
      description: 'Add a comment to a community post (only if topic is open)',
      tags: ['community'],
      params: {
        type: 'object',
        properties: {
          postId: { type: 'string', format: 'uuid' },
        },
        required: ['postId'],
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { postId } = request.params as { postId: string };
    const { content } = request.body as { content: string };
    app.logger.info({ userId: session.user.id, postId, contentLength: content.length }, 'Adding comment to community post');

    try {
      // Check if post exists and is open for comments
      const topic = await app.db.query.discussionTopics.findFirst({
        where: eq(schema.discussionTopics.id, postId),
      });

      if (!topic) {
        app.logger.warn({ postId }, 'Community post not found');
        return reply.status(404).send({ error: 'Community post not found.' });
      }

      if (topic.status === 'closed') {
        app.logger.warn({ postId, userId: session.user.id }, 'Cannot comment on closed topic');
        return reply.status(403).send({ error: 'This discussion is closed. No new comments are allowed.' });
      }

      const [newReply] = await app.db
        .insert(schema.discussionReplies)
        .values({
          topicId: postId,
          userId: session.user.id,
          content,
        })
        .returning();

      // Increment repliesCount on topic
      const newCount = (parseInt(topic.repliesCount.toString()) || 0) + 1;
      const updateData: any = { repliesCount: newCount.toString() };

      // Increment unreadRepliesCount if reply is from someone other than topic owner
      if (topic.userId !== session.user.id) {
        const newUnreadCount = (parseInt(topic.unreadRepliesCount.toString()) || 0) + 1;
        updateData.unreadRepliesCount = newUnreadCount.toString();
      }

      await app.db
        .update(schema.discussionTopics)
        .set(updateData)
        .where(eq(schema.discussionTopics.id, postId));

      app.logger.info({ replyId: newReply.id, postId, userId: session.user.id }, 'Comment added successfully');
      return newReply;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, postId }, 'Failed to add comment');
      return reply.status(500).send({ error: 'Failed to add comment' });
    }
  });

  // Get user's topics
  app.fastify.get('/api/my/community/topics', {
    schema: {
      description: 'Get current user\'s discussion topics',
      tags: ['community'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching user\'s discussion topics');

    try {
      const topics = await app.db
        .select()
        .from(schema.discussionTopics)
        .where(eq(schema.discussionTopics.userId, session.user.id))
        .orderBy(desc(schema.discussionTopics.createdAt));

      app.logger.info({ userId: session.user.id, count: topics.length }, 'User discussion topics fetched successfully');
      return topics;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch user discussion topics');
      return reply.status(500).send({ error: 'Failed to fetch user discussion topics' });
    }
  });

  // Delete a discussion topic (owner only, cascades to all replies)
  app.fastify.delete('/api/community/topics/:id', {
    schema: {
      description: 'Delete own discussion topic and all its replies',
      tags: ['community'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
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

    const { id } = request.params as { id: string };
    app.logger.info({ userId: session.user.id, topicId: id }, 'Deleting discussion topic');

    try {
      const topic = await app.db.query.discussionTopics.findFirst({
        where: eq(schema.discussionTopics.id, id),
      });

      if (!topic) {
        app.logger.warn({ topicId: id }, 'Discussion topic not found');
        return reply.status(404).send({ error: 'Discussion topic not found' });
      }

      if (topic.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, topicId: id }, 'Unauthorized topic delete attempt');
        return reply.status(403).send({ error: 'You can only delete your own topics' });
      }

      // Two-step delete process
      if (topic.status === 'open') {
        // First delete: close the topic instead of permanently deleting
        await app.db
          .update(schema.discussionTopics)
          .set({ status: 'closed', updatedAt: new Date() })
          .where(eq(schema.discussionTopics.id, id));

        app.logger.info({ topicId: id, userId: session.user.id }, 'Discussion topic closed successfully');
        return { success: true, action: 'closed', message: 'Topic closed successfully' };
      } else {
        // Second delete: permanently delete the topic and all replies
        await app.db
          .delete(schema.discussionTopics)
          .where(eq(schema.discussionTopics.id, id));

        app.logger.info({ topicId: id, userId: session.user.id }, 'Discussion topic and all replies deleted permanently');
        return { success: true, action: 'deleted', message: 'Topic deleted successfully' };
      }
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, topicId: id }, 'Failed to delete discussion topic');
      return reply.status(500).send({ error: 'Failed to delete discussion topic' });
    }
  });

  // Toggle like on a reply
  app.fastify.post('/api/community/replies/:replyId/like', {
    schema: {
      description: 'Toggle like on a discussion reply. If already liked, unlike. If not liked, like.',
      tags: ['community'],
      params: {
        type: 'object',
        properties: {
          replyId: { type: 'string', format: 'uuid' },
        },
        required: ['replyId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            liked: { type: 'boolean' },
            likeCount: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { replyId } = request.params as { replyId: string };
    app.logger.info({ userId: session.user.id, replyId }, 'Toggling like on reply');

    try {
      // Check if reply exists
      const reply_obj = await app.db.query.discussionReplies.findFirst({
        where: eq(schema.discussionReplies.id, replyId),
      });

      if (!reply_obj) {
        app.logger.warn({ replyId }, 'Discussion reply not found');
        return reply.status(404).send({ error: 'Discussion reply not found' });
      }

      // Check if user already liked this reply
      const existingLike = await app.db.query.replyLikes.findFirst({
        where: and(
          eq(schema.replyLikes.replyId, replyId),
          eq(schema.replyLikes.userId, session.user.id)
        ),
      });

      let liked = false;

      if (existingLike) {
        // Unlike: delete the like
        await app.db
          .delete(schema.replyLikes)
          .where(eq(schema.replyLikes.id, existingLike.id));
        app.logger.info({ replyId, userId: session.user.id }, 'Reply unliked');
      } else {
        // Like: create a new like
        await app.db
          .insert(schema.replyLikes)
          .values({
            replyId,
            userId: session.user.id,
          });
        liked = true;
        app.logger.info({ replyId, userId: session.user.id }, 'Reply liked');
      }

      // Get updated like count
      const likeCountResult = await app.db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.replyLikes)
        .where(eq(schema.replyLikes.replyId, replyId));

      const likeCount = likeCountResult[0]?.count || 0;

      app.logger.info({ replyId, userId: session.user.id, liked, likeCount }, 'Like toggle completed');
      return { liked, likeCount };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, replyId }, 'Failed to toggle like on reply');
      return reply.status(500).send({ error: 'Failed to toggle like on reply' });
    }
  });

  // Get unread replies count for a topic
  app.fastify.get('/api/community/topics/:id/unread-replies', {
    schema: {
      description: 'Get unread replies count for a topic (owner only)',
      tags: ['community'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            unreadCount: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    app.logger.info({ userId: session.user.id, topicId: id }, 'Fetching unread replies count');

    try {
      const topic = await app.db.query.discussionTopics.findFirst({
        where: eq(schema.discussionTopics.id, id),
      });

      if (!topic) {
        app.logger.warn({ topicId: id }, 'Discussion topic not found');
        return reply.status(404).send({ error: 'Discussion topic not found' });
      }

      // Only topic owner can see unread count
      if (topic.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, topicId: id }, 'Unauthorized - not topic owner');
        return reply.status(403).send({ error: 'You can only view unread replies for your own topics' });
      }

      const unreadCount = parseInt(topic.unreadRepliesCount.toString()) || 0;
      app.logger.info({ topicId: id, unreadCount }, 'Unread replies count fetched successfully');
      return { unreadCount };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, topicId: id }, 'Failed to fetch unread replies count');
      return reply.status(500).send({ error: 'Failed to fetch unread replies count' });
    }
  });

  // Mark all replies as read for a topic
  app.fastify.post('/api/community/topics/:id/mark-replies-read', {
    schema: {
      description: 'Mark all replies as read for a topic (owner only)',
      tags: ['community'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
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

    const { id } = request.params as { id: string };
    app.logger.info({ userId: session.user.id, topicId: id }, 'Marking replies as read');

    try {
      const topic = await app.db.query.discussionTopics.findFirst({
        where: eq(schema.discussionTopics.id, id),
      });

      if (!topic) {
        app.logger.warn({ topicId: id }, 'Discussion topic not found');
        return reply.status(404).send({ error: 'Discussion topic not found' });
      }

      // Only topic owner can mark replies as read
      if (topic.userId !== session.user.id) {
        app.logger.warn({ userId: session.user.id, topicId: id }, 'Unauthorized - not topic owner');
        return reply.status(403).send({ error: 'You can only mark replies as read for your own topics' });
      }

      // Mark all replies for this topic as read
      await app.db
        .update(schema.discussionReplies)
        .set({ isRead: true })
        .where(eq(schema.discussionReplies.topicId, id));

      // Reset unread replies count
      await app.db
        .update(schema.discussionTopics)
        .set({ unreadRepliesCount: '0', updatedAt: new Date() })
        .where(eq(schema.discussionTopics.id, id));

      app.logger.info({ topicId: id, userId: session.user.id }, 'Replies marked as read successfully');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, topicId: id }, 'Failed to mark replies as read');
      return reply.status(500).send({ error: 'Failed to mark replies as read' });
    }
  });

  // Get unread topics count for current user
  app.fastify.get('/api/community/unread-count', {
    schema: {
      description: 'Get count of topics with unread replies for current user',
      tags: ['community'],
      response: {
        200: {
          type: 'object',
          properties: {
            unreadTopicsCount: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching unread topics count');

    try {
      const unreadTopics = await app.db
        .select({
          id: schema.discussionTopics.id,
        })
        .from(schema.discussionTopics)
        .where(and(
          eq(schema.discussionTopics.userId, session.user.id),
          sql`${schema.discussionTopics.unreadRepliesCount} > 0`
        ));

      const unreadTopicsCount = unreadTopics.length;
      app.logger.info({ userId: session.user.id, unreadTopicsCount }, 'Unread topics count fetched successfully');
      return { unreadTopicsCount };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch unread topics count');
      return reply.status(500).send({ error: 'Failed to fetch unread topics count' });
    }
  });

  // List community posts with city filtering and sorting
  app.fastify.get('/api/community-posts', {
    schema: {
      description: 'List community discussion posts with city filtering and sorting',
      tags: ['community'],
      querystring: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          sort: { type: 'string', enum: ['newest', 'trending', 'oldest'] },
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const filters = request.query as { city?: string; sort?: 'newest' | 'trending' | 'oldest'; limit?: string; offset?: string };
    app.logger.info({ filters }, 'Listing community posts');

    try {
      const conditions: any[] = [];

      // Filter by city if provided
      if (filters.city) {
        conditions.push(eq(schema.discussionTopics.location, filters.city));
      }

      const limit = parseInt(filters.limit || '20');
      const offset = parseInt(filters.offset || '0');

      const topics = await app.db
        .select({
          id: schema.discussionTopics.id,
          userId: schema.discussionTopics.userId,
          category: schema.discussionTopics.category,
          location: schema.discussionTopics.location,
          title: schema.discussionTopics.title,
          description: schema.discussionTopics.description,
          status: schema.discussionTopics.status,
          unreadRepliesCount: schema.discussionTopics.unreadRepliesCount,
          replyCount: sql<number>`(SELECT COUNT(*) FROM ${schema.discussionReplies} WHERE ${schema.discussionReplies.topicId} = ${schema.discussionTopics.id})`,
          createdAt: schema.discussionTopics.createdAt,
          updatedAt: schema.discussionTopics.updatedAt,
          username: schema.profiles.username,
        })
        .from(schema.discussionTopics)
        .leftJoin(schema.profiles, eq(schema.discussionTopics.userId, schema.profiles.userId))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Apply sorting after retrieving data
      let sortedTopics = topics;
      if (filters.sort === 'trending') {
        // Sort by actual replyCount DESC, then by updatedAt DESC (latest activity first)
        sortedTopics = topics.sort((a, b) => {
          const replyCountDiff = (b.replyCount || 0) - (a.replyCount || 0);
          if (replyCountDiff !== 0) return replyCountDiff;
          // Secondary sort: latest updated first
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      } else if (filters.sort === 'oldest') {
        // Sort by createdAt ASC (oldest posts first)
        sortedTopics = topics.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } else {
        // Default: newest (sort by createdAt DESC)
        sortedTopics = topics.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      // Apply pagination after sorting
      const paginatedTopics = sortedTopics.slice(
        parseInt(filters.offset || '0'),
        parseInt(filters.offset || '0') + parseInt(filters.limit || '20')
      );

      // Transform to include user object and formatted metadata
      const result = paginatedTopics.map(topic => {
        const date = new Date(topic.createdAt);
        const formattedDate = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
        return {
          ...topic,
          shortId: generateShortId(topic.id),
          isOwner: false, // Set to false for list endpoint (frontend can determine based on userId)
          user: {
            id: topic.userId,
            username: topic.username || 'Unknown User',
          },
          username: undefined,
          byline: `by ${topic.username || 'Unknown User'} on ${formattedDate}`,
        };
      });

      app.logger.info({ count: result.length }, 'Community posts listed successfully');
      return result;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to list community posts');
      return reply.status(500).send({ error: 'Failed to list community posts' });
    }
  });

}
