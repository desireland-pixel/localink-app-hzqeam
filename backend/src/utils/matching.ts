import type { App } from '../index.js';
import { eq, and, or, lte, gte, isNull, ne, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';

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

async function matchSublet(app: App, subletId: string) {
  // Get the sublet details
  const sublet = await app.db.query.sublets.findFirst({
    where: eq(schema.sublets.id, subletId),
  });

  if (!sublet) {
    app.logger.warn({ subletId }, 'Sublet not found for matching');
    return;
  }

  app.logger.info({ subletId, city: sublet.city }, 'Running matching for sublet');

  // Find matching travel posts (all active ones, filter in memory for date overlap)
  const allTravelPosts = await app.db
    .select()
    .from(schema.travelPosts)
    .where(
      and(
        isNull(schema.travelPosts.deletedAt),
        isNull(schema.travelPosts.closedAt),
        eq(schema.travelPosts.status, 'active'),
        ne(schema.travelPosts.userId, sublet.userId),
      ),
    );

  for (const travelPost of allTravelPosts) {
    // Check city match
    const cityMatch =
      travelPost.fromCity?.toLowerCase() === sublet.city.toLowerCase() ||
      travelPost.toCity?.toLowerCase() === sublet.city.toLowerCase();

    if (!cityMatch) continue;

    // Check date overlap
    const travelEnd = travelPost.travelDateTo || travelPost.travelDate;
    const datesOverlap =
      new Date(travelPost.travelDate) <= new Date(sublet.availableTo) &&
      new Date(travelEnd) >= new Date(sublet.availableFrom);

    if (datesOverlap) {
      await insertMatchNotification(
        app,
        subletId,
        'sublet',
        travelPost.id,
        'travel',
        travelPost.userId,
        `A sublet in ${sublet.city} matches your travel dates!`,
      );
    }
  }

  // Find matching sublet posts
  const allSublets = await app.db
    .select()
    .from(schema.sublets)
    .where(
      and(
        isNull(schema.sublets.deletedAt),
        isNull(schema.sublets.closedAt),
        eq(schema.sublets.status, 'active'),
        ne(schema.sublets.userId, sublet.userId),
      ),
    );

  for (const otherSublet of allSublets) {
    // Case-insensitive city comparison
    if (otherSublet.city.toLowerCase() !== sublet.city.toLowerCase()) {
      continue;
    }

    // Check date overlap
    const datesOverlap =
      new Date(otherSublet.availableFrom) <= new Date(sublet.availableTo) &&
      new Date(otherSublet.availableTo) >= new Date(sublet.availableFrom);

    if (datesOverlap) {
      await insertMatchNotification(
        app,
        subletId,
        'sublet',
        otherSublet.id,
        'sublet',
        otherSublet.userId,
        `Another sublet in ${sublet.city} overlaps with yours — connect!`,
      );
    }
  }
}

async function matchTravelPost(app: App, travelPostId: string) {
  // Get the travel post details
  const travelPost = await app.db.query.travelPosts.findFirst({
    where: eq(schema.travelPosts.id, travelPostId),
  });

  if (!travelPost) {
    app.logger.warn({ travelPostId }, 'Travel post not found for matching');
    return;
  }

  app.logger.info(
    { travelPostId, from: travelPost.fromCity, to: travelPost.toCity },
    'Running matching for travel post',
  );

  // Find matching sublet posts (all active ones, filter in memory for date overlap)
  const allSublets = await app.db
    .select()
    .from(schema.sublets)
    .where(
      and(
        isNull(schema.sublets.deletedAt),
        isNull(schema.sublets.closedAt),
        eq(schema.sublets.status, 'active'),
        ne(schema.sublets.userId, travelPost.userId),
      ),
    );

  for (const sublet of allSublets) {
    // Check if city matches from or to city
    const cityMatches =
      sublet.city.toLowerCase() === travelPost.fromCity.toLowerCase() ||
      sublet.city.toLowerCase() === travelPost.toCity.toLowerCase();

    if (!cityMatches) continue;

    // Check date overlap
    const travelEnd = travelPost.travelDateTo || travelPost.travelDate;
    const datesOverlap =
      new Date(sublet.availableFrom) <= new Date(travelEnd) &&
      new Date(sublet.availableTo) >= new Date(travelPost.travelDate);

    if (datesOverlap) {
      await insertMatchNotification(
        app,
        travelPostId,
        'travel',
        sublet.id,
        'sublet',
        sublet.userId,
        `Someone's travel plans match your sublet in ${sublet.city}!`,
      );
    }
  }

  // Find matching travel posts (all active ones, filter in memory for date overlap)
  const allTravelPosts = await app.db
    .select()
    .from(schema.travelPosts)
    .where(
      and(
        isNull(schema.travelPosts.deletedAt),
        isNull(schema.travelPosts.closedAt),
        eq(schema.travelPosts.status, 'active'),
        ne(schema.travelPosts.userId, travelPost.userId),
      ),
    );

  for (const otherTravel of allTravelPosts) {
    // Check if cities match
    const citiesMatch =
      otherTravel.fromCity.toLowerCase() === travelPost.fromCity.toLowerCase() &&
      otherTravel.toCity.toLowerCase() === travelPost.toCity.toLowerCase();

    if (!citiesMatch) continue;

    // Check date overlap
    const travelEnd = travelPost.travelDateTo || travelPost.travelDate;
    const otherTravelEnd = otherTravel.travelDateTo || otherTravel.travelDate;
    const datesOverlap =
      new Date(otherTravel.travelDate) <= new Date(travelEnd) &&
      new Date(otherTravelEnd) >= new Date(travelPost.travelDate);

    if (datesOverlap) {
      await insertMatchNotification(
        app,
        travelPostId,
        'travel',
        otherTravel.id,
        'travel',
        otherTravel.userId,
        `Someone is travelling ${travelPost.fromCity} → ${travelPost.toCity} around the same time!`,
      );
    }
  }
}

async function insertMatchNotification(
  app: App,
  postId: string,
  postType: 'sublet' | 'travel',
  matchedPostId: string,
  matchedPostType: 'sublet' | 'travel',
  notifiedUserId: string,
  notificationBody: string,
) {
  // Check if notification already exists
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

  // Insert notification
  const [notification] = await app.db
    .insert(schema.matchNotifications)
    .values({
      postId,
      postType,
      matchedPostId,
      matchedPostType,
      notifiedUserId,
    })
    .returning();

  app.logger.info(
    { notificationId: notification.id, notifiedUserId },
    'Match notification created',
  );

  // Send OneSignal push notification
  await sendOneSignalPush(app, notifiedUserId, notificationBody, matchedPostId, matchedPostType, notification.id);
}

async function sendOneSignalPush(
  app: App,
  userId: string,
  body: string,
  matchedPostId: string,
  matchedPostType: string,
  notificationId: string,
) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey) {
    app.logger.warn({}, 'OneSignal env vars not configured, skipping push');
    return;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${restApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        include_aliases: { external_id: [userId] },
        target_channel: 'push',
        headings: { en: 'New Match Found! 🎉' },
        contents: { en: body },
        data: {
          type: 'post_match',
          post_id: matchedPostId,
          post_type: matchedPostType,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      app.logger.warn(
        { userId, status: response.status, error },
        'OneSignal push failed',
      );
      return;
    }

    // Mark push as sent
    await app.db
      .update(schema.matchNotifications)
      .set({
        pushSent: true,
        pushSentAt: new Date(),
      })
      .where(eq(schema.matchNotifications.id, notificationId));

    app.logger.info({ userId, notificationId }, 'OneSignal push sent successfully');
  } catch (error) {
    app.logger.error({ err: error, userId }, 'Error sending OneSignal push');
  }
}
