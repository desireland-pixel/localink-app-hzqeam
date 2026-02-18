import { pgTable, uuid, text, timestamp, numeric, date, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';
import { relations } from 'drizzle-orm';

// Extended user profile with GDPR compliance
export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  username: text('username').unique(), // Unique username, nullable initially
  city: text('city').notNull(),
  photoUrl: text('photo_url'), // Profile photo URL
  // GDPR Compliance
  gdprConsentAccepted: boolean('gdpr_consent_accepted').default(false).notNull(),
  gdprConsentAcceptedAt: timestamp('gdpr_consent_accepted_at', { withTimezone: true }),
  dataDeleteRequestedAt: timestamp('data_delete_requested_at', { withTimezone: true }), // Set when user requests deletion
  dataDeletedAt: timestamp('data_deleted_at', { withTimezone: true }), // Set when deletion is processed
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

// OTP verifications for email verification
export const otpVerifications = pgTable('otp_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  otp: text('otp').notNull(), // 6-digit OTP code
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Password reset tokens
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: uuid('token').defaultRandom().notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Sublet posts
export const sublets = pgTable('sublets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['offering', 'seeking'] }).notNull().default('offering'),
  title: text('title').notNull(),
  description: text('description'),
  city: text('city').notNull(),
  availableFrom: date('available_from').notNull(),
  availableTo: date('available_to').notNull(),
  rent: numeric('rent'),
  imageUrls: text('image_urls').array(),
  // Common fields
  cityRegistrationRequired: boolean('city_registration_required'),
  // Offering-specific fields
  address: text('address'),
  pincode: text('pincode'),
  deposit: text('deposit'),
  // Consent field for independent arrangement acknowledgment
  independentArrangementConsent: boolean('independent_arrangement_consent').default(false).notNull(),
  status: text('status', { enum: ['active', 'closed'] }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Travel buddy posts
export const travelPosts = pgTable('travel_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['offering', 'seeking', 'seeking-ally'] }).notNull(),
  description: text('description'),
  fromCity: text('from_city').notNull(),
  toCity: text('to_city').notNull(),
  travelDate: date('travel_date').notNull(),
  // Seeking-specific fields
  companionshipFor: text('companionship_for', { enum: ['Mother', 'Father', 'Parents', 'MIL', 'FIL', 'Others'] }),
  travelDateTo: date('travel_date_to'),
  // Seeking-ally specific field (free text for items)
  item: text('item'),
  // Offering-specific fields
  canOfferCompanionship: boolean('can_offer_companionship'),
  canCarryItems: boolean('can_carry_items'),
  // Incentive field (in euros, optional)
  incentiveAmount: numeric('incentive_amount'),
  // Consent fields
  companionshipConsent: boolean('companionship_consent').default(false).notNull(), // For offering companionship
  allyConsent: boolean('ally_consent').default(false).notNull(), // For seeking ally
  seekingConsent: boolean('seeking_consent').default(false).notNull(), // For seeking companionship
  status: text('status', { enum: ['active', 'closed'] }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Conversations (1:1 chats)
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  participant1Id: text('participant1_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  participant2Id: text('participant2_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  postId: uuid('post_id'),
  postType: text('post_type', { enum: ['sublet', 'travel'] }),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Messages
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Favorites (Likes) - for sublets, travel posts, and community discussions
export const favorites = pgTable('favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull(),
  postType: text('post_type', { enum: ['sublet', 'travel', 'community'] }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueFavorite: uniqueIndex('favorites_user_post_type_idx').on(table.userId, table.postId, table.postType),
}));

// Relations
export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(user, {
    fields: [profiles.userId],
    references: [user.id],
  }),
}));

export const subletsRelations = relations(sublets, ({ one }) => ({
  user: one(user, {
    fields: [sublets.userId],
    references: [user.id],
  }),
}));

export const travelPostsRelations = relations(travelPosts, ({ one }) => ({
  user: one(user, {
    fields: [travelPosts.userId],
    references: [user.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  participant1: one(user, {
    fields: [conversations.participant1Id],
    references: [user.id],
  }),
  participant2: one(user, {
    fields: [conversations.participant2Id],
    references: [user.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(user, {
    fields: [messages.senderId],
    references: [user.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(user, {
    fields: [favorites.userId],
    references: [user.id],
  }),
}));

// Community discussion topics
export const discussionTopics = pgTable('discussion_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  category: text('category').notNull(), // e.g., "Visa", "Travel Insurance", "Health", etc.
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['open', 'closed'] }).default('open').notNull(),
  repliesCount: numeric('replies_count').default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Community discussion replies
export const discussionReplies = pgTable('discussion_replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  topicId: uuid('topic_id').notNull().references(() => discussionTopics.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Push notification tokens
export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  platform: text('platform', { enum: ['ios', 'android'] }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations for community
export const discussionTopicsRelations = relations(discussionTopics, ({ one, many }) => ({
  user: one(user, {
    fields: [discussionTopics.userId],
    references: [user.id],
  }),
  replies: many(discussionReplies),
}));

export const discussionRepliesRelations = relations(discussionReplies, ({ one }) => ({
  topic: one(discussionTopics, {
    fields: [discussionReplies.topicId],
    references: [discussionTopics.id],
  }),
  user: one(user, {
    fields: [discussionReplies.userId],
    references: [user.id],
  }),
}));

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  user: one(user, {
    fields: [pushTokens.userId],
    references: [user.id],
  }),
}));
