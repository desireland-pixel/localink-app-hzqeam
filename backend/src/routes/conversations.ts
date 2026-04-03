import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, desc, asc, inArray, ne, isNull } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';
import { wsManager } from '../websocket-manager.js';
import { sendPushNotification } from '../utils/push-notifications.js';
import { sendPushNotification as sendOnesignalNotification } from '../utils/onesignal.js';

interface CreateConversationBody {
  postId: string;
  postType: 'sublet' | 'travel' | 'community';
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
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching user conversations');

    try {
      // Get conversations where user is a participant AND messages have been sent
      const conversations = await app.db.query.conversations.findMany({
        where: and(
          or(
            eq(schema.conversations.participant1Id, session.user.id),
            eq(schema.conversations.participant2Id, session.user.id)
          ),
          eq(schema.conversations.hasSentMessages, true)
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
      const communityTopicIds = new Set<string>();
      conversations.forEach(conv => {
        if (conv.postType === 'sublet') {
          subletIds.add(conv.postId);
        } else if (conv.postType === 'travel') {
          travelPostIds.add(conv.postId);
        } else if (conv.postType === 'community') {
          communityTopicIds.add(conv.postId);
        }
      });

      // Fetch all sublets, travel posts, and community topics in parallel
      const [subletsList, travelPostsList, communityTopicsList] = await Promise.all([
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
        communityTopicIds.size > 0
          ? app.db.query.discussionTopics.findMany({
              where: inArray(schema.discussionTopics.id, Array.from(communityTopicIds)),
            })
          : Promise.resolve([]),
      ]);

      const subletsMap = new Map(subletsList.map(s => [s.id, s]));
      const travelPostsMap = new Map(travelPostsList.map(t => [t.id, t]));
      const communityTopicsMap = new Map(communityTopicsList.map(c => [c.id, c]));

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
        } else if (conv.postType === 'community') {
          const topic = communityTopicsMap.get(conv.postId);
          if (topic) {
            post = {
              id: topic.id,
              title: topic.title,
              type: 'community' as const,
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
          postType: { type: 'string', enum: ['sublet', 'travel', 'community'] },
          recipientId: { type: 'string' },
        },
        additionalProperties: true,
      },
      response: {
        200: {
          type: 'object',
          required: ['id', 'participant1Id', 'participant2Id', 'postId', 'postType', 'hasSentMessages', 'createdAt'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            participant1Id: { type: 'string' },
            participant2Id: { type: 'string' },
            postId: { type: 'string', format: 'uuid' },
            postType: { type: 'string', enum: ['sublet', 'travel', 'community'] },
            lastMessageAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
            hasSentMessages: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
          additionalProperties: true,
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { postId, postType, recipientId } = request.body as CreateConversationBody;
    app.logger.info({ userId: session.user.id, postId, postType, recipientId }, 'Creating conversation');

    try {
      // Validate post exists based on post type
      if (postType === 'community') {
        const topic = await app.db.query.discussionTopics.findFirst({
          where: and(
            eq(schema.discussionTopics.id, postId),
            isNull(schema.discussionTopics.deletedAt)
          ),
        });
        if (!topic) {
          app.logger.warn({ postId }, 'Community topic not found');
          return reply.status(404).send({ error: 'Community topic not found' });
        }
      }

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
        return reply.code(200).send(existing);
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
      return reply.code(200).send(conversation);
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Failed to create conversation');
      return reply.status(500).send({ error: 'Failed to create conversation' });
    }
  });

  // Get conversation details with participant and post information
  app.fastify.get('/api/conversations/:id', {
    schema: {
      description: 'Get conversation details including participant and post information',
      tags: ['conversations'],
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
          required: ['conversation'],
          properties: {
            conversation: {
              type: 'object',
              additionalProperties: true,
            },
          },
          additionalProperties: true,
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };

    app.logger.info({ userId: session.user.id, conversationId: id }, 'Fetching conversation details');

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
      if (conversation.postType === 'sublet' && conversation.postId) {
        const sublet = await app.db.query.sublets.findFirst({
          where: and(
            eq(schema.sublets.id, conversation.postId),
            isNull(schema.sublets.deletedAt)
          ),
        });
        if (sublet) {
          post = {
            id: sublet.id,
            title: sublet.title,
            type: 'sublet' as const,
          };
        }
      } else if (conversation.postType === 'travel' && conversation.postId) {
        const travelPost = await app.db.query.travelPosts.findFirst({
          where: and(
            eq(schema.travelPosts.id, conversation.postId),
            isNull(schema.travelPosts.deletedAt)
          ),
        });
        if (travelPost) {
          post = {
            id: travelPost.id,
            title: `${travelPost.fromCity} → ${travelPost.toCity}`,
            type: 'travel' as const,
          };
        }
      } else if (conversation.postType === 'community' && conversation.postId) {
        const topic = await app.db.query.discussionTopics.findFirst({
          where: eq(schema.discussionTopics.id, conversation.postId),
        });
        if (topic) {
          post = {
            id: topic.id,
            title: topic.title,
            type: 'community' as const,
          };
        }
      }

      app.logger.info({ conversationId: id }, 'Conversation details fetched successfully');

      return {
        conversation: {
          id: conversation.id,
          postId: conversation.postId,
          postType: conversation.postType,
          createdAt: conversation.createdAt,
          otherParticipant: {
            id: otherParticipantId,
            name: otherParticipant.name,
            username: otherParticipantProfile?.username || null,
          },
          post: post,
        },
      };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, conversationId: id }, 'Failed to fetch conversation details');
      return reply.status(500).send({ error: 'Failed to fetch conversation details' });
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
      response: {
        200: {
          type: 'object',
          required: ['messages', 'conversation'],
          properties: {
            messages: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true,
              },
            },
            conversation: {
              type: 'object',
              additionalProperties: true,
            },
          },
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
      if (conversation.postType === 'sublet' && conversation.postId) {
        const sublet = await app.db.query.sublets.findFirst({
          where: and(
            eq(schema.sublets.id, conversation.postId),
            isNull(schema.sublets.deletedAt)
          ),
        });
        if (sublet) {
          post = {
            id: sublet.id,
            title: sublet.title,
            type: 'sublet' as const,
          };
        }
      } else if (conversation.postType === 'travel' && conversation.postId) {
        const travelPost = await app.db.query.travelPosts.findFirst({
          where: and(
            eq(schema.travelPosts.id, conversation.postId),
            isNull(schema.travelPosts.deletedAt)
          ),
        });
        if (travelPost) {
          post = {
            id: travelPost.id,
            title: `${travelPost.fromCity} → ${travelPost.toCity}`,
            type: 'travel' as const,
          };
        }
      } else if (conversation.postType === 'community' && conversation.postId) {
        const topic = await app.db.query.discussionTopics.findFirst({
          where: eq(schema.discussionTopics.id, conversation.postId),
        });
        if (topic) {
          post = {
            id: topic.id,
            title: topic.title,
            type: 'community' as const,
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

      // Get messages (sorted ascending by createdAt)
      const messages = await app.db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, id))
        .orderBy(asc(schema.messages.createdAt))
        .limit(limit)
        .offset(offset);

      // Get sender profiles for all messages to include username/name info
      const senderIds = new Set(messages.map(m => m.senderId));
      const senderProfiles = senderIds.size > 0
        ? await app.db.query.profiles.findMany({
            where: inArray(schema.profiles.userId, Array.from(senderIds)),
          })
        : [];

      const senderProfileMap = new Map(senderProfiles.map(p => [p.userId, p]));

      // Get user table entries for senders to get names as fallback
      const users = senderIds.size > 0
        ? await app.db.query.user.findMany({
            where: inArray(user.id, Array.from(senderIds)),
          })
        : [];

      const userMap = new Map(users.map(u => [u.id, u]));

      // Map messages to response format with only required fields
      const messagesWithSender = messages.map(msg => ({
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        readAt: msg.readAt,
        deliveredAt: msg.deliveredAt,
        createdAt: msg.createdAt,
      }));

      app.logger.info({ conversationId: id, count: messagesWithSender.length }, 'Messages fetched and marked as read successfully');

      return {
        conversation: {
          id: conversation.id,
          postId: conversation.postId,
          postType: conversation.postType,
          createdAt: conversation.createdAt,
          otherParticipant: {
            id: otherParticipantId,
            name: otherParticipant.name,
            username: otherParticipantProfile?.username || null,
          },
          post: post,
        },
        messages: messagesWithSender,
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
        additionalProperties: true,
      },
      response: {
        200: {
          type: 'object',
          required: ['id', 'conversationId', 'senderId', 'content', 'createdAt'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            conversationId: { type: 'string', format: 'uuid' },
            senderId: { type: 'string' },
            content: { type: 'string' },
            deliveredAt: { type: 'string', format: 'date-time' },
            readAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
            createdAt: { type: 'string', format: 'date-time' },
            sender: { type: 'object', additionalProperties: true },
          },
          additionalProperties: true,
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

      // Create message with immediate delivery timestamp
      const now = new Date();
      const [message] = await app.db
        .insert(schema.messages)
        .values({
          conversationId: id,
          senderId: session.user.id,
          content,
          deliveredAt: now,
        })
        .returning();

      // Fetch sender profile and get participant details to include name
      const senderProfile = await app.db.query.profiles.findFirst({
        where: eq(schema.profiles.userId, session.user.id),
      });

      // Get conversation details to get sender's name
      const fullConversation = await app.db.query.conversations.findFirst({
        where: eq(schema.conversations.id, id),
        with: {
          participant1: true,
          participant2: true,
        },
      });

      const senderName = conversation.participant1Id === session.user.id
        ? fullConversation?.participant1.name
        : fullConversation?.participant2.name;

      // Update conversation: set lastMessageAt and hasSentMessages to true
      await app.db
        .update(schema.conversations)
        .set({ lastMessageAt: new Date(), hasSentMessages: true })
        .where(eq(schema.conversations.id, id));

      const messageWithSender = {
        ...message,
        sender: {
          id: session.user.id,
          name: senderName,
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

      // Check recipient's notification preferences before sending push
      const recipientPreferences = await app.db.query.userNotificationPreferences.findFirst({
        where: eq(schema.userNotificationPreferences.userId, recipientId),
      });

      const shouldNotifyMessages = recipientPreferences?.notifyMessages ?? true;
      const shouldNotifyPush = recipientPreferences?.notifyPush ?? true;

      if (shouldNotifyMessages && shouldNotifyPush) {
        // Send push notification to recipient
        const recipientProfile = await app.db.query.profiles.findFirst({
          where: eq(schema.profiles.userId, recipientId),
        });

        sendPushNotification(app, {
          to: '',
          title: `New message from ${senderName || 'Someone'}`,
          body: content.substring(0, 100),
          data: {
            conversationId: id,
          },
        }, recipientId);

        // Send OneSignal notification to recipient (fire-and-forget)
        const recipientOnesignalToken = await app.db.query.userOnesignalTokens.findFirst({
          where: eq(schema.userOnesignalTokens.userId, recipientId),
        });

        if (recipientOnesignalToken) {
          sendOnesignalNotification(app, [recipientOnesignalToken.playerId], `New message from ${senderName || 'Someone'}`, content.substring(0, 100), { conversationId: id });
        }
      }

      return reply.code(200).send(messageWithSender);
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
      response: {
        200: {
          type: 'object',
          required: ['success', 'markedCount'],
          properties: {
            success: { type: 'boolean' },
            markedCount: { type: 'number' },
          },
          additionalProperties: true,
        },
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
      return reply.code(200).send({ success: true, markedCount });
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, conversationId: id }, 'Failed to mark messages as read');
      return reply.status(500).send({ error: 'Failed to mark messages as read' });
    }
  });

  // Delete a message from conversation
  app.fastify.delete('/api/conversations/:conversationId/messages/:messageId', {
    schema: {
      description: 'Delete a message from a conversation (user must be participant in conversation)',
      tags: ['conversations'],
      params: {
        type: 'object',
        properties: {
          conversationId: { type: 'string', format: 'uuid' },
          messageId: { type: 'string', format: 'uuid' },
        },
        required: ['conversationId', 'messageId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { conversationId, messageId } = request.params as { conversationId: string; messageId: string };
    app.logger.info({ userId: session.user.id, conversationId, messageId }, 'Deleting message');

    try {
      // Verify user is a participant in the conversation
      const conversation = await app.db.query.conversations.findFirst({
        where: eq(schema.conversations.id, conversationId),
      });

      if (!conversation) {
        app.logger.warn({ conversationId }, 'Conversation not found');
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      // Check if user is a participant
      const isParticipant =
        conversation.participant1Id === session.user.id ||
        conversation.participant2Id === session.user.id;

      if (!isParticipant) {
        app.logger.warn({ userId: session.user.id, conversationId }, 'Unauthorized - user is not a participant');
        return reply.status(403).send({ error: 'You must be a participant in this conversation to delete messages' });
      }

      // Check if message exists and belongs to this conversation
      const message = await app.db.query.messages.findFirst({
        where: eq(schema.messages.id, messageId),
      });

      if (!message) {
        app.logger.warn({ messageId }, 'Message not found');
        return reply.status(404).send({ error: 'Message not found' });
      }

      if (message.conversationId !== conversationId) {
        app.logger.warn({ messageId, conversationId }, 'Message does not belong to this conversation');
        return reply.status(400).send({ error: 'Message does not belong to this conversation' });
      }

      // Delete the message
      await app.db
        .delete(schema.messages)
        .where(eq(schema.messages.id, messageId));

      app.logger.info({ messageId, conversationId, userId: session.user.id }, 'Message deleted successfully');
      return reply.code(200).send({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id, conversationId, messageId }, 'Failed to delete message');
      return reply.status(500).send({ error: 'Failed to delete message' });
    }
  });
}
