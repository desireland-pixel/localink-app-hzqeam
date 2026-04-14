import type { App } from '../index.js';
import { lte, or, eq, and, inArray, isNotNull } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';

/**
 * Cleanup job that runs daily to permanently delete soft-deleted posts
 * after 30 days and clean up associated data, and purge accounts scheduled for deletion
 */
export async function startCleanupJob(app: App): Promise<void> {
  // Run startup purge after 10 seconds
  setTimeout(async () => {
    await runAccountPurge(app);
  }, 10 * 1000);

  // Run cleanup every 24 hours
  setInterval(async () => {
    await runCleanup(app);
  }, 24 * 60 * 60 * 1000);

  // Run account purge every 24 hours
  setInterval(async () => {
    await runAccountPurge(app);
  }, 24 * 60 * 60 * 1000);

  app.logger.info({}, 'Cleanup job started - runs every 24 hours');
}

async function runCleanup(app: App): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    app.logger.info({ cutoffDate: thirtyDaysAgoIso }, 'Starting cleanup job');

    // Clean up sublets
    await cleanupSublets(app, thirtyDaysAgoIso);

    // Clean up travel posts
    await cleanupTravelPosts(app, thirtyDaysAgoIso);

    // Clean up community posts
    await cleanupCommunityPosts(app, thirtyDaysAgoIso);

    app.logger.info({}, 'Cleanup job completed successfully');
  } catch (error) {
    app.logger.error({ err: error }, 'Cleanup job failed');
  }
}

async function cleanupSublets(app: App, thirtyDaysAgoIso: string): Promise<void> {
  try {
    // Find soft-deleted or old closed sublets
    const subletsToDelete = await app.db
      .select({ id: schema.sublets.id, imageUrls: schema.sublets.imageUrls })
      .from(schema.sublets)
      .where(
        or(
          and(isNotNull(schema.sublets.deletedAt), lte(schema.sublets.deletedAt, thirtyDaysAgoIso as any)),
          and(isNotNull(schema.sublets.closedAt), lte(schema.sublets.closedAt, thirtyDaysAgoIso as any))
        )!
      );

    if (subletsToDelete.length === 0) {
      return;
    }

    const subletIds = subletsToDelete.map(s => s.id);

    // Delete associated favorites
    await app.db
      .delete(schema.favorites)
      .where(
        and(
          inArray(schema.favorites.postId, subletIds),
          eq(schema.favorites.postType, 'sublet')
        )
      );

    // Delete associated conversations (but keep messages)
    const conversations = await app.db
      .select({ id: schema.conversations.id })
      .from(schema.conversations)
      .where(
        and(
          inArray(schema.conversations.postId, subletIds),
          eq(schema.conversations.postType, 'sublet')
        )
      );

    const conversationIds = conversations.map(c => c.id);
    if (conversationIds.length > 0) {
      // Delete messages first
      await app.db
        .delete(schema.messages)
        .where(inArray(schema.messages.conversationId, conversationIds));
      // Then delete conversations
      await app.db
        .delete(schema.conversations)
        .where(inArray(schema.conversations.id, conversationIds));
    }

    // Delete the sublet posts
    await app.db
      .delete(schema.sublets)
      .where(inArray(schema.sublets.id, subletIds));

    app.logger.info({ count: subletsToDelete.length }, 'Cleaned up sublets');
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to cleanup sublets');
  }
}

async function cleanupTravelPosts(app: App, thirtyDaysAgoIso: string): Promise<void> {
  try {
    // Find soft-deleted or old closed travel posts
    const postsToDelete = await app.db
      .select({ id: schema.travelPosts.id })
      .from(schema.travelPosts)
      .where(
        or(
          and(isNotNull(schema.travelPosts.deletedAt), lte(schema.travelPosts.deletedAt, thirtyDaysAgoIso as any)),
          and(isNotNull(schema.travelPosts.closedAt), lte(schema.travelPosts.closedAt, thirtyDaysAgoIso as any))
        )!
      );

    if (postsToDelete.length === 0) {
      return;
    }

    const postIds = postsToDelete.map(p => p.id);

    // Delete associated favorites
    await app.db
      .delete(schema.favorites)
      .where(
        and(
          inArray(schema.favorites.postId, postIds),
          eq(schema.favorites.postType, 'travel')
        )
      );

    // Delete associated conversations (but keep messages)
    const conversations = await app.db
      .select({ id: schema.conversations.id })
      .from(schema.conversations)
      .where(
        and(
          inArray(schema.conversations.postId, postIds),
          eq(schema.conversations.postType, 'travel')
        )
      );

    const conversationIds = conversations.map(c => c.id);
    if (conversationIds.length > 0) {
      // Delete messages first
      await app.db
        .delete(schema.messages)
        .where(inArray(schema.messages.conversationId, conversationIds));
      // Then delete conversations
      await app.db
        .delete(schema.conversations)
        .where(inArray(schema.conversations.id, conversationIds));
    }

    // Delete the travel posts
    await app.db
      .delete(schema.travelPosts)
      .where(inArray(schema.travelPosts.id, postIds));

    app.logger.info({ count: postsToDelete.length }, 'Cleaned up travel posts');
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to cleanup travel posts');
  }
}

async function cleanupCommunityPosts(app: App, thirtyDaysAgoIso: string): Promise<void> {
  try {
    // Find soft-deleted community posts
    const postsToDelete = await app.db
      .select({ id: schema.discussionTopics.id })
      .from(schema.discussionTopics)
      .where(and(isNotNull(schema.discussionTopics.deletedAt), lte(schema.discussionTopics.deletedAt, thirtyDaysAgoIso as any)));

    if (postsToDelete.length === 0) {
      return;
    }

    const postIds = postsToDelete.map(p => p.id);

    // Delete associated favorites
    await app.db
      .delete(schema.favorites)
      .where(
        and(
          inArray(schema.favorites.postId, postIds),
          eq(schema.favorites.postType, 'community')
        )
      );

    // Delete associated replies and their likes
    const replies = await app.db
      .select({ id: schema.discussionReplies.id })
      .from(schema.discussionReplies)
      .where(inArray(schema.discussionReplies.topicId, postIds));

    const replyIds = replies.map(r => r.id);
    if (replyIds.length > 0) {
      // Delete reply likes
      await app.db
        .delete(schema.replyLikes)
        .where(inArray(schema.replyLikes.replyId, replyIds));
      // Delete replies
      await app.db
        .delete(schema.discussionReplies)
        .where(inArray(schema.discussionReplies.id, replyIds));
    }

    // Delete the discussion topics
    await app.db
      .delete(schema.discussionTopics)
      .where(inArray(schema.discussionTopics.id, postIds));

    app.logger.info({ count: postsToDelete.length }, 'Cleaned up community posts');
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to cleanup community posts');
  }
}

async function runAccountPurge(app: App): Promise<void> {
  try {
    const now = new Date();
    const usersToDelete = await app.db
      .select({ id: authSchema.user.id, email: authSchema.user.email })
      .from(authSchema.user)
      .where(
        and(
          isNotNull(authSchema.user.scheduledDeletionAt),
          lte(authSchema.user.scheduledDeletionAt, now as any)
        )
      );

    if (usersToDelete.length === 0) {
      return;
    }

    for (const user of usersToDelete) {
      try {
        // Delete in order of dependencies
        await app.db.delete(schema.replyLikes).where(eq(schema.replyLikes.userId, user.id));
        await app.db.delete(schema.discussionReplies).where(eq(schema.discussionReplies.userId, user.id));
        await app.db.delete(schema.discussionTopics).where(eq(schema.discussionTopics.userId, user.id));
        await app.db.delete(schema.favorites).where(eq(schema.favorites.userId, user.id));
        await app.db.delete(schema.messages).where(eq(schema.messages.senderId, user.id));

        // Delete conversations where user is participant
        await app.db
          .delete(schema.conversations)
          .where(
            or(
              eq(schema.conversations.participant1Id, user.id),
              eq(schema.conversations.participant2Id, user.id)
            )
          );

        await app.db.delete(schema.pushTokens).where(eq(schema.pushTokens.userId, user.id));
        await app.db.delete(schema.userOnesignalTokens).where(eq(schema.userOnesignalTokens.userId, user.id));
        await app.db.delete(schema.userNotificationPreferences).where(eq(schema.userNotificationPreferences.userId, user.id));
        await app.db.delete(schema.sublets).where(eq(schema.sublets.userId, user.id));
        await app.db.delete(schema.travelPosts).where(eq(schema.travelPosts.userId, user.id));
        await app.db.delete(schema.profiles).where(eq(schema.profiles.userId, user.id));
        await app.db.delete(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.userId, user.id));

        // Delete OTP verifications by email
        await app.db.delete(schema.otpVerifications).where(eq(schema.otpVerifications.email, user.email));

        // Delete auth tables
        await app.db.delete(authSchema.session).where(eq(authSchema.session.userId, user.id));
        await app.db.delete(authSchema.account).where(eq(authSchema.account.userId, user.id));
        await app.db.delete(authSchema.verification).where(eq(authSchema.verification.identifier, user.id));

        // Delete the user
        await app.db.delete(authSchema.user).where(eq(authSchema.user.id, user.id));

        app.logger.info({ userId: user.id, userEmail: user.email }, '[PURGE] Deleted user');
      } catch (error) {
        app.logger.error({ err: error, userId: user.id, userEmail: user.email }, '[PURGE] Failed to delete user');
      }
    }

    app.logger.info({ count: usersToDelete.length }, `[PURGE] Completed. Deleted ${usersToDelete.length} user(s).`);
  } catch (error) {
    app.logger.error({ err: error }, '[PURGE] Account purge job failed');
  }
}
