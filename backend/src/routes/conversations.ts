import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, desc, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { wsManager } from '../websocket-manager.js';

interface CreateConversationBody {
  postId: string;
  postType: 'sublet' | 'travel';
  recipientId: string;
}

interface SendMessageBody {
  content: string;
}

interface PaginationQuery {
  limit?: string;
  offset?: string;
}

export function registerConversationRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // List all conversations for current user
  app.fastify.get('/api/conversations', {
    schema: {
      description: 'List all conversations for current user with last message preview',
      tags: ['conversations'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching user conversations');

    try {
      // Get conversations where user is a participant
      const conversations = await app.db.query.conversations.findMany({
        where: or(
          eq(schema.conversations.participant1Id, session.user.id),
          eq(schema.conversations.participant2Id, session.user.id)
        ),
        orderBy: [desc(schema.conversations.lastMessageAt), desc(schema.conversations.createdAt)],
        with: {
          messages: {
            limit: 1,
            orderBy: desc(schema.messages.createdAt),
          },
          participant1: true,
          participant2: true,
        },
      });

      // Get other participant profiles to include username
      const otherParticipantIds = new Set<string>();
      conversations.forEach(conv => {
        const otherParticipantId = conv.participant1Id === session.user.id ? conv.participant2Id : conv.participant1Id;
        otherParticipantIds.add(otherParticipantId);
      });

      const ids = Array.from(otherParticipantIds);
      const profiles = ids.length > 0 ? await app.db.query.profiles.findMany({
        where: inArray(schema.profiles.userId, ids),
      }) : [];

      const profileMap = new Map(profiles.map(p => [p.userId, p]));

      // Format response with last message and other participant info
      const formatted = conversations.map(conv => {
        const isCurrentUserParticipant1 = conv.participant1Id === session.user.id;
        const otherParticipantId = isCurrentUserParticipant1 ? conv.participant2Id : conv.participant1Id;
        const otherParticipant = isCurrentUserParticipant1 ? conv.participant2 : conv.participant1;
        const profile = profileMap.get(otherParticipantId);

        // Determine unread count based on current user's position
        // If user is participant1, unread count is the stored unreadCount
        // If user is participant2, we need to count unread messages from participant1
        // For now, we'll use a simple approach: if user is participant2, use unreadCount
        const unreadCount = isCurrentUserParticipant1
          ? 0  // Participant1 unread tracking is handled differently
          : parseInt(conv.unreadCount?.toString() || '0');

        return {
          id: conv.id,
          participant1Id: conv.participant1Id,
          participant2Id: conv.participant2Id,
          postId: conv.postId,
          postType: conv.postType,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: unreadCount,
          createdAt: conv.createdAt,
          lastMessage: conv.messages[0] || null,
          otherParticipant: {
            id: otherParticipantId,
            name: otherParticipant.name,
            username: profile?.username || null,
          },
        };
      });

      app.logger.info({ userId: session.user.id, count: formatted.length }, 'Conversations fetched successfully');
      return formatted;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch conversations');
      return reply.status(500).send({ error: 'Failed to fetch conversations' });
    }
  });

  // Start a new conversation
  app.fastify.post('/api/conversations', {
    schema: {
      description: 'Start a new conversation (linked to a post)',
      tags: ['conversations'],
      body: {
        type: 'object',
        required: ['postId', 'postType', 'recipientId'],
        properties: {
          postId: { type: 'string', format: 'uuid' },
          postType: { type: 'string', enum: ['sublet', 'travel'] },
          recipientId: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { postId, postType, recipientId } = request.body as CreateConversationBody;
    app.logger.info({ userId: session.user.id, postId, postType, recipientId }, 'Creating conversation');

    try {
      // Check if conversation already exists between these users for this post
      const existing = await app.db.query.conversations.findFirst({
        where: and(
          eq(schema.conversations.postId, postId),
          or(
            and(
              eq(schema.conversations.participant1Id, session.user.id),
              eq(schema.conversations.participant2Id, recipientId)
            ),
            and(
              eq(schema.conversations.participant1Id, recipientId),
              eq(schema.conversations.participant2Id, session.user.id)
            )
          )
        ),
      });

      if (existing) {
        app.logger.info({ conversationId: existing.id }, 'Conversation already exists');
        return existing;
      }

      // Create new conversation
      const [conversation] = await app.db
        .insert(schema.conversations)
        .values({
          participant1Id: session.user.id,
          participant2Id: recipientId,
          postId,
          postType,
        })
        .returning();

      app.logger.info({ conversationId: conversation.id, userId: session.user.id }, 'Conversation created successfully');
      return conversation;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to create conversation');
      return reply.status(500).send({ error: 'Failed to create conversation' });
    }
  });

  // Get messages for a conversation
  app.fastify.get('/api/conversations/:id/messages', {
    schema: {
      description: 'Get messages for a conversation (paginated, sorted oldest to newest). Marks all messages as read.',
      tags: ['conversations'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const query = request.query as PaginationQuery;
    const limit = parseInt(query.limit || '50');
    const offset = parseInt(query.offset || '0');

    app.logger.info({ userId: session.user.id, conversationId: id, limit, offset }, 'Fetching conversation messages');

    try {
      // Check if user is a participant
      const conversation = await app.db.query.conversations.findFirst({
        where: eq(schema.conversations.id, id),
      });

      if (!conversation) {
        app.logger.warn({ conversationId: id }, 'Conversation not found');
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      if (conversation.participant1Id !== session.user.id && conversation.participant2Id !== session.user.id) {
        app.logger.warn({ userId: session.user.id, conversationId: id }, 'Unauthorized conversation access attempt');
        return reply.status(403).send({ error: 'You are not a participant in this conversation' });
      }

      // Get messages sorted oldest to newest (chronological order)
      const messages = await app.db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, id))
        .orderBy(schema.messages.createdAt)  // Ascending order = oldest first
        .limit(limit)
        .offset(offset);

      // Mark all messages as read and update unreadCount to 0
      // Only mark messages from other participants as read
      const otherParticipantId = conversation.participant1Id === session.user.id
        ? conversation.participant2Id
        : conversation.participant1Id;

      await app.db
        .update(schema.messages)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(schema.messages.conversationId, id),
            eq(schema.messages.senderId, otherParticipantId)
          )
        );

      // Reset unreadCount to 0
      await app.db
        .update(schema.conversations)
        .set({ unreadCount: 0 })
        .where(eq(schema.conversations.id, id));

      app.logger.info({ conversationId: id, count: messages.length }, 'Messages fetched and marked as read successfully');
      return messages;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, conversationId: id }, 'Failed to fetch messages');
      return reply.status(500).send({ error: 'Failed to fetch messages' });
    }
  });

  // Send a message
  app.fastify.post('/api/conversations/:id/messages', {
    schema: {
      description: 'Send a message in a conversation',
      tags: ['conversations'],
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
    const { content } = request.body as SendMessageBody;

    app.logger.info({ userId: session.user.id, conversationId: id }, 'Sending message');

    try {
      // Check if user is a participant
      const conversation = await app.db.query.conversations.findFirst({
        where: eq(schema.conversations.id, id),
      });

      if (!conversation) {
        app.logger.warn({ conversationId: id }, 'Conversation not found');
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      if (conversation.participant1Id !== session.user.id && conversation.participant2Id !== session.user.id) {
        app.logger.warn({ userId: session.user.id, conversationId: id }, 'Unauthorized message send attempt');
        return reply.status(403).send({ error: 'You are not a participant in this conversation' });
      }

      // Create message
      const [message] = await app.db
        .insert(schema.messages)
        .values({
          conversationId: id,
          senderId: session.user.id,
          content,
        })
        .returning();

      // Fetch sender profile to include username
      const senderProfile = await app.db.query.profiles.findFirst({
        where: eq(schema.profiles.userId, session.user.id),
      });

      // Determine recipient (the other participant)
      const recipientId = conversation.participant1Id === session.user.id
        ? conversation.participant2Id
        : conversation.participant1Id;

      // Increment unreadCount for recipient
      const currentUnreadCount = parseInt(conversation.unreadCount?.toString() || '0');
      const newUnreadCount = currentUnreadCount + 1;

      // Update conversation lastMessageAt and unreadCount
      await app.db
        .update(schema.conversations)
        .set({
          lastMessageAt: new Date(),
          unreadCount: newUnreadCount,
        })
        .where(eq(schema.conversations.id, id));

      const messageWithSender = {
        ...message,
        sender: {
          id: session.user.id,
          username: senderProfile?.username || session.user.email,
        },
      };

      app.logger.info({ messageId: message.id, conversationId: id, userId: session.user.id, unreadCount: newUnreadCount }, 'Message sent successfully');

      // Broadcast message to recipient via WebSocket
      wsManager.broadcastToUsers([recipientId], {
        type: 'new_message',
        conversationId: id,
        message: messageWithSender,
      });

      return messageWithSender;
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, conversationId: id }, 'Failed to send message');
      return reply.status(500).send({ error: 'Failed to send message' });
    }
  });
}
