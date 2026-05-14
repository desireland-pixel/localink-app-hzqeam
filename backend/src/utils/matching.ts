import type { App } from '../index.js';
import { eq, and, or, lte, gte, isNull, ne, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import { sendPushNotification } from './onesignal.js';
import { COUNTRY_CITIES } from '../cities.js';

/**
 * Get city group: array containing the city (lowercased) plus all cities in the same country and the country name.
 * If the city is not found in any country, returns only the city itself lowercased.
 */
function getCityGroup(city: string): string[] {
  const lowercasedCity = city.toLowerCase();

  // Check if city is in any country
  for (const [country, cities] of Object.entries(COUNTRY_CITIES)) {
    const citiesLower = cities.map(c => c.toLowerCase());
    if (citiesLower.includes(lowercasedCity)) {
      // Return all cities in the country + country name, all lowercased
      return [
        lowercasedCity,
        ...citiesLower.filter(c => c !== lowercasedCity),
        country.toLowerCase(),
      ];
    }
  }

  // City not found in any country, return just the city
  return [lowercasedCity];
}

/**
 * Check if two city groups overlap (share at least one element).
 */
function cityGroupsOverlap(a: string[], b: string[]): boolean {
  return a.some(city => b.includes(city));
}

/**
 * Insert a match notification with rate limiting, deduplication, and push notification support.
 */
async function insertMatchNotification(
  app: App,
  postId: string,
  postType: 'sublet' | 'travel',
  matchedPostId: string,
  matchedPostType: 'sublet' | 'travel',
  notifiedUserId: string,
  notificationBody: string,
) {
  try {
    // Deduplication: Skip if this exact pair already exists
    const existing = await app.db.query.matchNotifications.findFirst({
      where: and(
        eq(schema.matchNotifications.postId, postId),
        eq(schema.matchNotifications.matchedPostId, matchedPostId),
      ),
    });

    if (existing) {
      app.logger.debug({ postId, matchedPostId }, 'Match notification already exists');
      return;
    }

    // Rate limiting: Count pushes sent to this user today (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const pushCountToday = await app.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.matchNotifications)
      .where(
        and(
          eq(schema.matchNotifications.notifiedUserId, notifiedUserId),
          eq(schema.matchNotifications.pushSent, true),
          gte(schema.matchNotifications.pushSentAt, today),
          lte(schema.matchNotifications.pushSentAt, tomorrow),
        ),
      );

    const pushLimit = 2;
    const isRateLimited = (pushCountToday[0]?.count || 0) >= pushLimit;

    // User preference check: Look up userNotificationPreferences
    // If no preference row exists or notifyPush is not false, push is enabled
    const userPreferences = await app.db.query.userNotificationPreferences.findFirst({
      where: eq(schema.userNotificationPreferences.userId, notifiedUserId),
    });

    const isPushEnabled = userPreferences?.notifyPush !== false;

    // Send push notification if enabled and not rate-limited
    let pushSent = false;
    let pushSentAt: Date | null = null;

    if (isPushEnabled && !isRateLimited) {
      try {
        const result = await sendPushNotification(
          app,
          [notifiedUserId],
          'New Match!',
          notificationBody,
          {
            type: 'post_match',
            post_id: matchedPostId,
            post_type: matchedPostType,
          },
        );
        pushSent = result;
        if (pushSent) {
          pushSentAt = new Date();
        }
      } catch (error) {
        app.logger.warn(
          { err: error, notifiedUserId, matchedPostId },
          'Failed to send push notification, but continuing with record insertion',
        );
      }
    }

    // Insert record regardless of push success
    const [notification] = await app.db
      .insert(schema.matchNotifications)
      .values({
        postId,
        postType,
        matchedPostId,
        matchedPostType,
        notifiedUserId,
        pushSent,
        pushSentAt,
      })
      .returning();

    app.logger.info(
      { notificationId: notification.id, notifiedUserId, pushSent },
      'Match notification created',
    );
  } catch (error) {
    app.logger.error(
      { err: error, postId, matchedPostId, notifiedUserId },
      'Failed to insert match notification',
    );
  }
}

export async function runMatchingForPost(app: App, postId: string, postType: 'sublet' | 'travel') {
  try {
    if (postType === 'sublet') {
      await matchSublet(app, postId);
    } else if (postType === 'travel') {
      await matchTravelPost(app, postId);
    }
  } catch (error) {
    app.logger.error({ err: error, postId, postType }, 'Error running matching for post');
  }
}

/**
 * Match sublets: offering matches seeking, seeking matches offering.
 */
async function matchSublet(app: App, newSubletId: string) {
  try {
    // Load the new sublet from sublets table (must not be deleted or closed)
    const newSublet = await app.db.query.sublets.findFirst({
      where: and(
        eq(schema.sublets.id, newSubletId),
        isNull(schema.sublets.deletedAt),
        isNull(schema.sublets.closedAt),
      ),
    });

    if (!newSublet) {
      app.logger.warn({ newSubletId }, 'Sublet not found or deleted/closed for matching');
      return;
    }

    app.logger.info({ subletId: newSubletId, city: newSublet.city }, 'Running matching for sublet');

    // Determine required type: offering matches seeking, seeking matches offering
    const requiredType = newSublet.type === 'offering' ? 'seeking' : 'offering';

    // Fetch candidate sublets: different user, correct type, status 'active', not deleted/closed
    const candidateSublets = await app.db
      .select()
      .from(schema.sublets)
      .where(
        and(
          ne(schema.sublets.userId, newSublet.userId),
          eq(schema.sublets.type, requiredType),
          eq(schema.sublets.status, 'active'),
          isNull(schema.sublets.deletedAt),
          isNull(schema.sublets.closedAt),
          sql`LOWER(${schema.sublets.city}) = LOWER(${newSublet.city})`,
        ),
      );

    for (const candidate of candidateSublets) {
      // Rent check: If both have rent values, require ≤20% relative difference
      if (newSublet.rent && candidate.rent) {
        const newRentNum = parseFloat(newSublet.rent);
        const candidateRentNum = parseFloat(candidate.rent);
        const maxRent = Math.max(newRentNum, candidateRentNum);
        const difference = Math.abs(newRentNum - candidateRentNum);
        const relativeDifference = (difference / maxRent) * 100;

        if (relativeDifference > 20) {
          app.logger.debug(
            { newSubletId, candidateId: candidate.id, relativeDifference },
            'Rent difference exceeds 20%, skipping',
          );
          continue;
        }
      }

      // Date overlap check
      const datesOverlap =
        new Date(newSublet.availableFrom) <= new Date(candidate.availableTo) &&
        new Date(newSublet.availableTo) >= new Date(candidate.availableFrom);

      if (!datesOverlap) {
        app.logger.debug(
          { newSubletId, candidateId: candidate.id },
          'Date range does not overlap, skipping',
        );
        continue;
      }

      // Notify the candidate's owner
      await insertMatchNotification(
        app,
        newSubletId,
        'sublet',
        candidate.id,
        'sublet',
        candidate.userId,
        `A sublet in ${newSublet.city} matches some of your requirements!`,
      );
    }
  } catch (error) {
    app.logger.error({ err: error, newSubletId }, 'Error matching sublet');
  }
}

/**
 * Match travel posts with type compatibility and city/country group overlap.
 */
async function matchTravelPost(app: App, newPostId: string) {
  try {
    // Load the new travel post from travelPosts table (must not be deleted or closed)
    const newPost = await app.db.query.travelPosts.findFirst({
      where: and(
        eq(schema.travelPosts.id, newPostId),
        isNull(schema.travelPosts.deletedAt),
        isNull(schema.travelPosts.closedAt),
      ),
    });

    if (!newPost) {
      app.logger.warn({ newPostId }, 'Travel post not found or deleted/closed for matching');
      return;
    }

    app.logger.info(
      { travelPostId: newPostId, from: newPost.fromCity, to: newPost.toCity },
      'Running matching for travel post',
    );

    // Get city groups for new post
    const newFromGroup = getCityGroup(newPost.fromCity);
    const newToGroup = getCityGroup(newPost.toCity);

    // Fetch all active travel posts from other users (not deleted/closed)
    const candidatePosts = await app.db
      .select()
      .from(schema.travelPosts)
      .where(
        and(
          ne(schema.travelPosts.userId, newPost.userId),
          eq(schema.travelPosts.status, 'active'),
          isNull(schema.travelPosts.deletedAt),
          isNull(schema.travelPosts.closedAt),
        ),
      );

    for (const candidate of candidatePosts) {
      // Type compatibility check
      let isTypeCompatible = false;

      if (newPost.type === 'offering') {
        // offering matches seeking or seeking-ally
        isTypeCompatible =
          candidate.type === 'seeking' || candidate.type === 'seeking-ally';
      } else if (newPost.type === 'seeking') {
        // seeking matches offering where canOfferCompanionship=true OR companionshipConsent=true
        isTypeCompatible =
          candidate.type === 'offering' &&
          (candidate.canOfferCompanionship === true || candidate.companionshipConsent === true);
      } else if (newPost.type === 'seeking-ally') {
        // seeking-ally matches offering where allyConsent=true
        isTypeCompatible = candidate.type === 'offering' && candidate.allyConsent === true;
      }

      if (!isTypeCompatible) {
        app.logger.debug(
          { newPostId, candidateId: candidate.id, newType: newPost.type, candidateType: candidate.type },
          'Type incompatible, skipping',
        );
        continue;
      }

      // City/country group overlap: both fromCity and toCity must have overlapping groups
      const candidateFromGroup = getCityGroup(candidate.fromCity);
      const candidateToGroup = getCityGroup(candidate.toCity);

      const fromCitiesOverlap = cityGroupsOverlap(newFromGroup, candidateFromGroup);
      const toCitiesOverlap = cityGroupsOverlap(newToGroup, candidateToGroup);

      if (!fromCitiesOverlap || !toCitiesOverlap) {
        app.logger.debug(
          { newPostId, candidateId: candidate.id, fromCitiesOverlap, toCitiesOverlap },
          'City groups do not overlap, skipping',
        );
        continue;
      }

      // Date overlap: Using travelDate as start and travelDateTo (falling back to travelDate) as end
      const newTravelEnd = newPost.travelDateTo || newPost.travelDate;
      const candidateTravelEnd = candidate.travelDateTo || candidate.travelDate;

      const datesOverlap =
        new Date(candidate.travelDate) <= new Date(newTravelEnd) &&
        new Date(candidateTravelEnd) >= new Date(newPost.travelDate);

      if (!datesOverlap) {
        app.logger.debug(
          { newPostId, candidateId: candidate.id },
          'Travel dates do not overlap, skipping',
        );
        continue;
      }

      // Notify the candidate's owner
      await insertMatchNotification(
        app,
        newPostId,
        'travel',
        candidate.id,
        'travel',
        candidate.userId,
        `Someone is travelling ${newPost.fromCity} → ${newPost.toCity} around the same time!`,
      );
    }
  } catch (error) {
    app.logger.error({ err: error, newPostId }, 'Error matching travel post');
  }
}
