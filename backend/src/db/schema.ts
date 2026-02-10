import { pgTable, uuid, text, timestamp, numeric, date, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';
import { relations } from 'drizzle-orm';

// Extended user profile
export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  city: text('city').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
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
  // Offering-specific fields
  address: text('address'),
  pincode: text('pincode'),
  cityRegistrationRequired: boolean('city_registration_required'),
  deposit: text('deposit'),
  status: text('status', { enum: ['active', 'closed'] }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Travel buddy posts
export const travelPosts = pgTable('travel_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['offering', 'seeking'] }).notNull(),
  description: text('description'),
  fromCity: text('from_city').notNull(),
  toCity: text('to_city').notNull(),
  travelDate: date('travel_date').notNull(),
  // Seeking-specific fields
  companionshipFor: text('companionship_for', { enum: ['Mother', 'Father', 'Parents', 'MIL', 'FIL', 'Others'] }),
  travelDateTo: date('travel_date_to'),
  status: text('status', { enum: ['active', 'closed'] }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Carry & Send posts
export const carryPosts = pgTable('carry_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  fromCity: text('from_city').notNull(),
  toCity: text('to_city').notNull(),
  travelDate: date('travel_date'),
  type: text('type', { enum: ['request', 'traveler'] }).notNull(),
  itemDescription: text('item_description'),
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
  postType: text('post_type', { enum: ['sublet', 'travel', 'carry'] }),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Messages
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Favorites (Likes)
export const favorites = pgTable('favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull(),
  postType: text('post_type', { enum: ['sublet', 'travel', 'carry'] }).notNull(),
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

export const carryPostsRelations = relations(carryPosts, ({ one }) => ({
  user: one(user, {
    fields: [carryPosts.userId],
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
