import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, desc, inArray, ne, isNull } from 'drizzle-orm';
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

  // Get unread conversation count for current user (for inbox icon badge)
  app.fastify.get('/api/conversations/unread-count', {
    schema: {
      description: 'Get number of conversations with unread messages (for inbox icon badge)',
      tags: ['conversations'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching unread conversation count');

    try {
      // Get all conversations for the user with their messages
      const conversations = await app.db.query.conversations.findMany({
        where: or(
          eq(schema.conversations.participant1Id, session.user.id),
          eq(schema.conversations.participant2Id, session.user.id)
        ),
        with: {
          messages: true,
        },
      });

      // Count conversations that have at least one unread message from other participants
      let unreadConversationCount = 0;
      conversations.forEach(conv => {
        const hasUnread = conv.messages.some(msg =>
          msg.senderId !== session.user.id && !msg.readAt
        );
        if (hasUnread) {
          unreadConversationCount++;
        }
      });

      app.logger.info({ userId: session.user.id, unreadConversationCount }, 'Unread conversation count fetched successfully');
      return { unreadConversationCount };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch unread conversation count');
      return reply.status(500).send({ error: 'Failed to fetch unread conversation count' });
    }
  });

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
          messages: true,  // Get all messages to count unread
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

      // Get all unique post IDs and their types
      const subletIds = new Set<string>();
      const travelPostIds = new Set<string>();
      conversations.forEach(conv => {
        if (conv.postType === 'sublet') {
          subletIds.add(conv.postId);
        } else if (conv.postType === 'travel') {
          travelPostIds.add(conv.postId);
        }
      });

      // Fetch all sublets and travel posts in parallel
      const [subletsList, travelPostsList] = await Promise.all([
        subletIds.size > 0
          ? app.db.query.sublets.findMany({
              where: inArray(schema.sublets.id, Array.from(subletIds)),
            })
          : Promise.resolve([]),
        travelPostIds.size > 0
          ? app.db.query.travelPosts.findMany({
              where: inArray(schema.travelPosts.id, Array.from(travelPostIds)),
            })
          : Promise.resolve([]),
      ]);

      const subletsMap = new Map(subletsList.map(s => [s.id, s]));
      const travelPostsMap = new Map(travelPostsList.map(t => [t.id, t]));

      // Format response with last message and other participant info
      const formatted = conversations.map(conv => {
        const otherParticipantId = conv.participant1Id === session.user.id ? conv.participant2Id : conv.participant1Id;
        const otherParticipant = conv.participant1Id === session.user.id ? conv.participant2 : conv.participant1;
        const profile = profileMap.get(otherParticipantId);

        // Count unread messages - messages from other participant that haven't been read
        const unreadCount = conv.messages.filter(msg =>
          msg.senderId !== session.user.id && !msg.readAt
        ).length;

        // Get last message (most recent)
        const lastMessage = conv.messages.length > 0
          ? conv.messages.reduce((latest, msg) =>
              new Date(msg.createdAt) > new Date(latest.createdAt) ? msg : latest
            )
          : null;

        // Get post details based on postType
        let post = null;
        if (conv.postType === 'sublet') {
          const sublet = subletsMap.get(conv.postId);
          if (sublet) {
            post = {
              id: sublet.id,
              title: sublet.title,
              type: 'sublet' as const,
            };
          }
        } else if (conv.postType === 'travel') {
          const travelPost = travelPostsMap.get(conv.postId);
          if (travelPost) {
            post = {
              id: travelPost.id,
              title: `${travelPost.fromCity} → ${travelPost.toCity}`,
              type: 'travel' as const,
            };
          }
        }

        return {
          id: conv.id,
          participant1Id: conv.participant1Id,
          participant2Id: conv.participant2Id,
          postId: conv.postId,
          postType: conv.postType,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: unreadCount,
          createdAt: conv.createdAt,
          lastMessage: lastMessage,
          otherParticipant: {
            id: otherParticipantId,
            name: otherParticipant.name,
            username: profile?.username || null,
          },
          post: post,
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

  // Get messages for a conversation with participant and post details
  app.fastify.get('/api/conversations/:id/messages', {
    schema: {
      description: 'Get messages for a conversation (paginated) with participant and post details',
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
      // Check if user is a participant and get conversation with participant details
      const conversation = await app.db.query.conversations.findFirst({
        where: eq(schema.conversations.id, id),
        with: {
          participant1: true,
          participant2: true,
        },
      });

      if (!conversation) {
        app.logger.warn({ conversationId: id }, 'Conversation not found');
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      if (conversation.participant1Id !== session.user.id && conversation.participant2Id !== session.user.id) {
        app.logger.warn({ userId: session.user.id, conversationId: id }, 'Unauthorized conversation access attempt');
        return reply.status(403).send({ error: 'You are not a participant in this conversation' });
      }

      // Get other participant
      const otherParticipantId = conversation.participant1Id === session.user.id ? conversation.participant2Id : conversation.participant1Id;
      const otherParticipant = conversation.participant1Id === session.user.id ? conversation.participant2 : conversation.participant1;

      // Fetch other participant's profile for username
      const otherParticipantProfile = await app.db.query.profiles.findFirst({
        where: eq(schema.profiles.userId, otherParticipantId),
      });

      // Fetch post details based on postType
      let post = null;
      if (conversation.postType === 'sublet') {
        const sublet = await app.db.query.sublets.findFirst({
          where: eq(schema.sublets.id, conversation.postId),
        });
        if (sublet) {
          post = {
            id: sublet.id,
            title: sublet.title,
            type: 'sublet' as const,
          };
        }
      } else if (conversation.postType === 'travel') {
        const travelPost = await app.db.query.travelPosts.findFirst({
          where: eq(schema.travelPosts.id, conversation.postId),
        });
        if (travelPost) {
          post = {
            id: travelPost.id,
            title: `${travelPost.fromCity} → ${travelPost.toCity}`,
            type: 'travel' as const,
          };
        }
      }

      // Mark all unread messages from the other participant as read
      await app.db
        .update(schema.messages)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(schema.messages.conversationId, id),
            ne(schema.messages.senderId, session.user.id),
            isNull(schema.messages.readAt)
          )
        );

      // Get messages (sorted descending as originally, frontend will handle sorting)
      const messages = await app.db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, id))
        .orderBy(desc(schema.messages.createdAt))
        .limit(limit)
        .offset(offset);

      app.logger.info({ conversationId: id, count: messages.length }, 'Messages fetched and marked as read successfully');

      return {
        messages,
        conversation: {
          id: conversation.id,
          otherParticipant: {
            id: otherParticipantId,
            name: otherParticipant.name,
            username: otherParticipantProfile?.username || null,
          },
          post: post,
        },
      };
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

      // Update conversation lastMessageAt
      await app.db
        .update(schema.conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(schema.conversations.id, id));

      const messageWithSender = {
        ...message,
        sender: {
          id: session.user.id,
          username: senderProfile?.username || session.user.email,
        },
      };

      app.logger.info({ messageId: message.id, conversationId: id, userId: session.user.id }, 'Message sent successfully');

      // Broadcast message to both participants via WebSocket
      const recipientId = conversation.participant1Id === session.user.id
        ? conversation.participant2Id
        : conversation.participant1Id;

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

  // Mark conversation messages as read
  app.fastify.post('/api/conversations/:id/mark-read', {
    schema: {
      description: 'Mark all unread messages in a conversation as read',
      tags: ['conversations'],
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
    app.logger.info({ userId: session.user.id, conversationId: id }, 'Marking messages as read');

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
        app.logger.warn({ userId: session.user.id, conversationId: id }, 'Unauthorized mark-read attempt');
        return reply.status(403).send({ error: 'You are not a participant in this conversation' });
      }

      // Count unread messages before update
      const unreadMessages = await app.db
        .select()
        .from(schema.messages)
        .where(
          and(
            eq(schema.messages.conversationId, id),
            ne(schema.messages.senderId, session.user.id),
            isNull(schema.messages.readAt)
          )
        );

      const markedCount = unreadMessages.length;

      // Mark all unread messages from the other participant as read
      if (markedCount > 0) {
        await app.db
          .update(schema.messages)
          .set({ readAt: new Date() })
          .where(
            and(
              eq(schema.messages.conversationId, id),
              ne(schema.messages.senderId, session.user.id),
              isNull(schema.messages.readAt)
            )
          );
      }

      app.logger.info({ conversationId: id, userId: session.user.id, markedCount }, 'Messages marked as read successfully');
      return { success: true, markedCount };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, conversationId: id }, 'Failed to mark messages as read');
      return reply.status(500).send({ error: 'Failed to mark messages as read' });
    }
  });
}
