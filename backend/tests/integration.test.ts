import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectAuthenticatedWebSocket, createTestFile } from "./helpers";

describe("API Integration Tests", () => {
  let authToken: string;
  let authUser: any;
  let subletId: string;
  let travelPostId: string;
  let communityTopicId: string;
  let replyId: string;
  let conversationId: string;
  let messageId: string;

  // ============ Auth & Profile Setup ============

  test("Sign up test user", async () => {
    const { token, user } = await signUpTestUser();
    authToken = token;
    authUser = user;
    expect(authToken).toBeDefined();
    expect(user.id).toBeDefined();
  });

  test("Get current user profile", async () => {
    const res = await authenticatedApi("/api/profile", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.userId).toBeDefined();
    expect(data.email).toBeDefined();
  });

  test("Update profile with new username and city", async () => {
    const uniqueUsername = `testuser_${crypto.randomUUID().substring(0, 8)}`;
    const res = await authenticatedApi("/api/profile", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: uniqueUsername,
        city: "Munich",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.username).toBe(uniqueUsername);
    expect(data.city).toBe("Munich");
  });

  test("Check username availability - unique username", async () => {
    const res = await api("/api/check-username?username=unique_username_99999");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.available).toBe("boolean");
  });

  test("Get disclaimer status", async () => {
    const res = await authenticatedApi("/api/profile/disclaimers", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.subletDisclaimerAccepted).toBe("boolean");
    expect(typeof data.travelDisclaimerAccepted).toBe("boolean");
  });

  test("Accept sublet disclaimer", async () => {
    const res = await authenticatedApi("/api/profile/disclaimers", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "sublet" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Accept travel disclaimer", async () => {
    const res = await authenticatedApi("/api/profile/disclaimers", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "travel" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Change password with wrong old password fails", async () => {
    const res = await authenticatedApi("/api/profile/change-password", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oldPassword: "WrongPassword123!",
        newPassword: "NewPassword456!",
      }),
    });
    // Expect either 200 or 400 (wrong old password)
    await expectStatus(res, 400);
  });

  // ============ Cities ============

  test("Get all cities", async () => {
    const res = await api("/api/cities");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.cities)).toBe(true);
    expect(data.cities.length > 0).toBe(true);
  });

  test("Get travel cities only", async () => {
    const res = await api("/api/cities?type=travel");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.cities)).toBe(true);
  });

  test("Search cities by prefix", async () => {
    const res = await api("/api/cities/search?q=New");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.cities)).toBe(true);
  });

  test("Search cities with limit parameter", async () => {
    const res = await api("/api/cities/search?q=New&limit=5");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.cities)).toBe(true);
  });

  // ============ Sublets CRUD ============

  test("Create sublet (offering type)", async () => {
    const res = await authenticatedApi("/api/sublets", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        title: "Cozy apartment in Munich",
        city: "Munich",
        availableFrom: "2026-06-01",
        availableTo: "2026-08-31",
        rent: "1500",
        description: "Beautiful 2-bedroom apartment with city views",
        address: "123 Main St, Munich",
        pincode: "80001",
        cityRegistrationRequired: false,
        independentArrangementConsent: true,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    subletId = data.id;
    expect(subletId).toBeDefined();
  });

  test("Get all sublets", async () => {
    const res = await api("/api/sublets");
    await expectStatus(res, 200);
  });

  test("Get sublets filtered by city", async () => {
    const res = await api("/api/sublets?city=Munich");
    await expectStatus(res, 200);
  });

  test("Get sublets filtered by type", async () => {
    const res = await api("/api/sublets?type=offering");
    await expectStatus(res, 200);
  });

  test("Get sublet by ID", async () => {
    const res = await api(`/api/sublets/${subletId}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(subletId);
  });

  test("Get sublet by non-existent ID returns 404", async () => {
    const res = await api("/api/sublets/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 404);
  });

  test("Get sublet by invalid UUID format returns 400", async () => {
    const res = await api("/api/sublets/invalid-uuid");
    await expectStatus(res, 400);
  });

  test("Update sublet - change title and rent", async () => {
    const res = await authenticatedApi(`/api/sublets/${subletId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated: Premium Manhattan Apartment",
        rent: "1800",
        description: "Updated description with more details",
      }),
    });
    await expectStatus(res, 200);
  });

  test("Get my sublets list", async () => {
    const res = await authenticatedApi("/api/my/sublets", authToken);
    await expectStatus(res, 200);
  });

  test("Close own sublet", async () => {
    const res = await authenticatedApi(`/api/sublets/${subletId}/close`, authToken, {
      method: "PATCH",
    });
    await expectStatus(res, 200);
  });

  test("Delete own sublet", async () => {
    const res = await authenticatedApi(`/api/sublets/${subletId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
  });

  test("Delete non-existent sublet returns 404", async () => {
    const res = await authenticatedApi("/api/sublets/00000000-0000-0000-0000-000000000000", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 404);
  });

  test("Delete sublet by invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/sublets/invalid-uuid", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 400);
  });

  test("Create sublet missing required field fails", async () => {
    const res = await authenticatedApi("/api/sublets", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        title: "Incomplete sublet",
        // Missing required: city, availableFrom, availableTo, independentArrangementConsent
      }),
    });
    await expectStatus(res, 400);
  });

  // ============ Travel Posts CRUD ============

  test("Create travel post (offering type)", async () => {
    const res = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        fromCity: "Berlin",
        toCity: "Munich",
        travelDate: "2026-07-15",
        description: "Looking for travel companion for trip within Germany",
        companionshipConsent: true,
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    travelPostId = data.id || data.travelPostId;
    expect(travelPostId).toBeDefined();
  });

  test("Get all travel posts", async () => {
    const res = await api("/api/travel-posts");
    await expectStatus(res, 200);
  });

  test("Get travel posts filtered by cities", async () => {
    const res = await api("/api/travel-posts?fromCity=Berlin&toCity=Munich");
    await expectStatus(res, 200);
  });

  test("Get travel posts filtered by role", async () => {
    const res = await api("/api/travel-posts?role=offering");
    await expectStatus(res, 200);
  });

  test("Get travel post by ID", async () => {
    const res = await api(`/api/travel-posts/${travelPostId}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(travelPostId);
  });

  test("Get travel post by non-existent ID returns 404", async () => {
    const res = await api("/api/travel-posts/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 404);
  });

  test("Get travel post by invalid UUID format returns 400", async () => {
    const res = await api("/api/travel-posts/invalid-uuid");
    await expectStatus(res, 400);
  });

  test("Update travel post", async () => {
    const res = await authenticatedApi(`/api/travel-posts/${travelPostId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Updated: Need two travel companions for adventure",
      }),
    });
    await expectStatus(res, 200);
  });

  test("Get my travel posts", async () => {
    const res = await authenticatedApi("/api/my/travel-posts", authToken);
    await expectStatus(res, 200);
  });

  test("Close own travel post", async () => {
    const res = await authenticatedApi(`/api/travel-posts/${travelPostId}/close`, authToken, {
      method: "PATCH",
    });
    await expectStatus(res, 200);
  });

  test("Delete own travel post", async () => {
    const res = await authenticatedApi(`/api/travel-posts/${travelPostId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
  });

  test("Delete travel post by invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/travel-posts/invalid-uuid", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 400);
  });

  test("Travel post missing required fields fails", async () => {
    const res = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        // Missing: fromCity, toCity, travelDate
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create travel post with seeking-ally type", async () => {
    const res = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "seeking-ally",
        fromCity: "Berlin",
        toCity: "Munich",
        travelDate: "2026-08-20",
        item: "Laptop",
        allyConsent: true,
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id || data.travelPostId).toBeDefined();
  });

  // ============ Favorites ============

  test("Create favorite on travel post", async () => {
    const createRes = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "seeking",
        fromCity: "Berlin",
        toCity: "Hamburg",
        travelDate: "2026-06-01",
        seekingConsent: true,
      }),
    });
    const createData = await createRes.json();
    const postId = createData.id || createData.travelPostId;

    const res = await authenticatedApi("/api/favorites", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        postType: "travel",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.favorite.id).toBeDefined();
    expect(data.favorite.postId).toBe(postId);
  });

  test("Get user favorites with pagination", async () => {
    const res = await authenticatedApi("/api/favorites", authToken);
    await expectStatus(res, 200);
  });

  test("Check if post is favorited", async () => {
    const createRes = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "seeking",
        fromCity: "Munich",
        toCity: "Frankfurt",
        travelDate: "2026-07-01",
        seekingConsent: true,
      }),
    });
    const createData = await createRes.json();
    const postId = createData.id || createData.travelPostId;

    const res = await authenticatedApi(`/api/favorites/check/${postId}?postType=travel`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.isFavorited).toBe("boolean");
  });

  test("Check if post is favorited with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/favorites/check/invalid-uuid?postType=travel", authToken);
    await expectStatus(res, 400);
  });

  test("Delete favorite from post", async () => {
    const createRes = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "seeking",
        fromCity: "Hamburg",
        toCity: "Cologne",
        travelDate: "2026-08-01",
        seekingConsent: true,
      }),
    });
    const createData = await createRes.json();
    const postId = createData.id || createData.travelPostId;

    await authenticatedApi("/api/favorites", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        postType: "travel",
      }),
    });

    const deleteRes = await authenticatedApi(`/api/favorites/${postId}?postType=travel`, authToken, {
      method: "DELETE",
    });
    await expectStatus(deleteRes, 200);
    const data = await deleteRes.json();
    expect(data.success).toBe(true);
  });

  test("Create favorite on sublet post", async () => {
    const createRes = await authenticatedApi("/api/sublets", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        title: "Favorite test sublet",
        city: "Vienna",
        availableFrom: "2026-05-01",
        availableTo: "2026-07-31",
        rent: "1000",
        independentArrangementConsent: true,
      }),
    });
    const createData = await createRes.json();
    const subletId = createData.id;

    const res = await authenticatedApi("/api/favorites", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: subletId,
        postType: "sublet",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.favorite.id).toBeDefined();
    expect(data.favorite.postType).toBe("sublet");
  });

  test("Check if sublet post is favorited", async () => {
    const createRes = await authenticatedApi("/api/sublets", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        title: "Check favorite test sublet",
        city: "Prague",
        availableFrom: "2026-04-01",
        availableTo: "2026-06-30",
        rent: "900",
        independentArrangementConsent: true,
      }),
    });
    const createData = await createRes.json();
    const subletId = createData.id;

    const res = await authenticatedApi(`/api/favorites/check/${subletId}?postType=sublet`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.isFavorited).toBe("boolean");
  });

  test("Delete favorite on sublet post", async () => {
    const createRes = await authenticatedApi("/api/sublets", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        title: "Delete favorite test sublet",
        city: "Zurich",
        availableFrom: "2026-03-01",
        availableTo: "2026-05-31",
        rent: "1200",
        independentArrangementConsent: true,
      }),
    });
    const createData = await createRes.json();
    const subletId = createData.id;

    await authenticatedApi("/api/favorites", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: subletId,
        postType: "sublet",
      }),
    });

    const res = await authenticatedApi(`/api/favorites/${subletId}?postType=sublet`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Create favorite on community post", async () => {
    const createRes = await authenticatedApi("/api/community/topics", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "General",
        title: "Favorite test community topic",
        description: "Testing community topic favorites",
        location: "Vienna",
      }),
    });
    const createData = await createRes.json();
    const topicId = createData.id;

    const res = await authenticatedApi("/api/favorites", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: topicId,
        postType: "community",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.favorite.id).toBeDefined();
    expect(data.favorite.postType).toBe("community");
  });

  test("Check if community post is favorited", async () => {
    const createRes = await authenticatedApi("/api/community/topics", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Housing",
        title: "Check favorite test community topic",
        description: "Testing favorite check on community",
        location: "Prague",
      }),
    });
    const createData = await createRes.json();
    const topicId = createData.id;

    const res = await authenticatedApi(`/api/favorites/check/${topicId}?postType=community`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.isFavorited).toBe("boolean");
  });

  test("Delete favorite on community post", async () => {
    const createRes = await authenticatedApi("/api/community/topics", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Local Tips",
        title: "Delete favorite test community topic",
        description: "Testing favorite deletion on community",
        location: "Zurich",
      }),
    });
    const createData = await createRes.json();
    const topicId = createData.id;

    await authenticatedApi("/api/favorites", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: topicId,
        postType: "community",
      }),
    });

    const res = await authenticatedApi(`/api/favorites/${topicId}?postType=community`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  // ============ Community Topics CRUD ============

  test("Create community discussion topic", async () => {
    const res = await authenticatedApi("/api/community/topics", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Housing",
        title: "Best neighborhoods for young professionals",
        description: "Share your favorite areas to live in the city",
        location: "Berlin",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    communityTopicId = data.id;
    expect(communityTopicId).toBeDefined();
  });

  test("Get all community topics", async () => {
    const res = await api("/api/community/topics");
    await expectStatus(res, 200);
  });

  test("Get community topics filtered by category and status", async () => {
    const res = await api("/api/community/topics?category=Housing&status=open");
    await expectStatus(res, 200);
  });

  test("Get community topic by ID with replies", async () => {
    const res = await api(`/api/community/topics/${communityTopicId}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(communityTopicId);
  });

  test("Get non-existent community topic returns 404", async () => {
    const res = await api("/api/community/topics/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 404);
  });

  test("Get community topic by invalid UUID format returns 400", async () => {
    const res = await api("/api/community/topics/invalid-uuid");
    await expectStatus(res, 400);
  });

  test("Update community topic title and description", async () => {
    const res = await authenticatedApi(`/api/community/topics/${communityTopicId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated: Best neighborhoods for renters",
        description: "Share your favorite affordable areas",
      }),
    });
    await expectStatus(res, 200);
  });

  test("Create reply to community topic", async () => {
    const res = await authenticatedApi(`/api/community/topics/${communityTopicId}/replies`, authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "I love the East Village! Great community vibe.",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    replyId = data.id;
    expect(replyId).toBeDefined();
  });

  test("Update own community reply", async () => {
    const res = await authenticatedApi(`/api/community/replies/${replyId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Updated: East Village is amazing! The restaurant scene is unbeatable.",
      }),
    });
    await expectStatus(res, 200);
  });

  test("Like community reply - toggle like", async () => {
    const res = await authenticatedApi(`/api/community/replies/${replyId}/like`, authToken, {
      method: "POST",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.liked).toBe("boolean");
    expect(typeof data.likeCount).toBe("number");
  });

  test("Get unread replies count for topic", async () => {
    const res = await authenticatedApi(`/api/community/topics/${communityTopicId}/unread-replies`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.unreadCount).toBe("number");
  });

  test("Mark all replies as read for topic", async () => {
    const res = await authenticatedApi(`/api/community/topics/${communityTopicId}/mark-replies-read`, authToken, {
      method: "POST",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Delete own community reply", async () => {
    const res = await authenticatedApi(`/api/community/replies/${replyId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
  });

  test("Get community unread topics count", async () => {
    const res = await authenticatedApi("/api/community/unread-count", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.unreadTopicsCount).toBe("number");
  });

  test("Get my community topics", async () => {
    const res = await authenticatedApi("/api/my/community/topics", authToken);
    await expectStatus(res, 200);
  });

  test("Close open community topic", async () => {
    const res = await authenticatedApi(`/api/community/topics/${communityTopicId}/close`, authToken, {
      method: "POST",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Delete community topic", async () => {
    const res = await authenticatedApi(`/api/community/topics/${communityTopicId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
  });

  test("Delete community topic by invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/community/topics/invalid-uuid", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 400);
  });

  test("Create topic missing required fields fails", async () => {
    const res = await authenticatedApi("/api/community/topics", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing required: category, title
      }),
    });
    await expectStatus(res, 400);
  });

  // ============ Community Posts & Comments ============

  test("Get all community posts", async () => {
    const res = await api("/api/community-posts");
    await expectStatus(res, 200);
  });

  test("Get community posts filtered by city", async () => {
    const res = await api("/api/community-posts?city=Berlin");
    await expectStatus(res, 200);
  });

  test("Get community posts with sorting", async () => {
    const res = await api("/api/community-posts?sort=newest");
    await expectStatus(res, 200);
  });

  test("Get comments for a community post", async () => {
    // Create a new topic to comment on
    const topicRes = await authenticatedApi("/api/community/topics", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "General",
        title: "Community comments test topic",
        description: "Testing comment functionality",
        location: "Berlin",
      }),
    });
    const topicData = await topicRes.json();
    const topicId = topicData.id;

    const res = await api(`/api/community/${topicId}/comments`);
    await expectStatus(res, 200);
  });

  test("Get comments for post with invalid UUID format returns 400", async () => {
    const res = await api("/api/community/invalid-uuid/comments");
    await expectStatus(res, 400);
  });

  test("Add a comment to a community post", async () => {
    // Create a topic for commenting
    const topicRes = await authenticatedApi("/api/community/topics", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "General",
        title: "Topic for test comments",
        description: "Test topic",
        location: "Munich",
      }),
    });
    const topicData = await topicRes.json();
    const topicId = topicData.id;

    const res = await authenticatedApi(`/api/community/${topicId}/comments`, authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "This is a test comment on the community post.",
      }),
    });
    await expectStatus(res, 200);
  });

  // ============ Conversations ============

  test("Get conversations list for current user", async () => {
    const res = await authenticatedApi("/api/conversations", authToken);
    await expectStatus(res, 200);
  });

  test("Get unread conversation count", async () => {
    const res = await authenticatedApi("/api/conversations/unread-count", authToken);
    await expectStatus(res, 200);
  });

  test("Start a new conversation on a travel post", async () => {
    // Create a travel post to start conversation on
    const postRes = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        fromCity: "Berlin",
        toCity: "Munich",
        travelDate: "2026-10-15",
        companionshipConsent: true,
      }),
    });
    const postData = await postRes.json();
    const postId = postData.id || postData.travelPostId;

    const res = await authenticatedApi("/api/conversations", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        postType: "travel",
        recipientId: authUser.id,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    conversationId = data.id;
    expect(conversationId).toBeDefined();
  });

  test("Send a message in a conversation", async () => {
    if (!conversationId) {
      // Create conversation if not exists
      const postRes = await authenticatedApi("/api/travel-posts", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "seeking",
          fromCity: "Berlin",
          toCity: "Hamburg",
          travelDate: "2026-11-01",
          seekingConsent: true,
        }),
      });
      const postData = await postRes.json();
      const postId = postData.id || postData.travelPostId;

      const convRes = await authenticatedApi("/api/conversations", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          postType: "travel",
          recipientId: authUser.id,
        }),
      });
      const convData = await convRes.json();
      conversationId = convData.id;
    }

    const res = await authenticatedApi(`/api/conversations/${conversationId}/messages`, authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Hello! I'm interested in this post.",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    messageId = data.id;
    expect(messageId).toBeDefined();
  });

  test("Get messages in a conversation", async () => {
    if (!conversationId) {
      const postRes = await authenticatedApi("/api/travel-posts", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "offering",
          fromCity: "Munich",
          toCity: "Frankfurt am Main",
          travelDate: "2026-12-01",
          companionshipConsent: true,
        }),
      });
      const postData = await postRes.json();
      const postId = postData.id || postData.travelPostId;

      const convRes = await authenticatedApi("/api/conversations", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          postType: "travel",
          recipientId: authUser.id,
        }),
      });
      const convData = await convRes.json();
      conversationId = convData.id;
    }

    const res = await authenticatedApi(`/api/conversations/${conversationId}/messages`, authToken);
    await expectStatus(res, 200);
  });

  test("Mark conversation as read", async () => {
    if (!conversationId) {
      const postRes = await authenticatedApi("/api/travel-posts", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "seeking",
          fromCity: "Hannover",
          toCity: "Cologne",
          travelDate: "2027-01-01",
          seekingConsent: true,
        }),
      });
      const postData = await postRes.json();
      const postId = postData.id || postData.travelPostId;

      const convRes = await authenticatedApi("/api/conversations", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          postType: "travel",
          recipientId: authUser.id,
        }),
      });
      const convData = await convRes.json();
      conversationId = convData.id;
    }

    const res = await authenticatedApi(`/api/conversations/${conversationId}/mark-read`, authToken, {
      method: "POST",
    });
    await expectStatus(res, 200);
  });

  test("Delete a message from a conversation", async () => {
    if (!conversationId || !messageId) {
      // Create conversation and message
      const postRes = await authenticatedApi("/api/travel-posts", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "offering",
          fromCity: "Düsseldorf",
          toCity: "Stuttgart",
          travelDate: "2027-02-01",
          companionshipConsent: true,
        }),
      });
      const postData = await postRes.json();
      const postId = postData.id || postData.travelPostId;

      const convRes = await authenticatedApi("/api/conversations", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          postType: "travel",
          recipientId: authUser.id,
        }),
      });
      const convData = await convRes.json();
      conversationId = convData.id;

      const msgRes = await authenticatedApi(`/api/conversations/${conversationId}/messages`, authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "This message will be deleted.",
        }),
      });
      const msgData = await msgRes.json();
      messageId = msgData.id;
    }

    const res = await authenticatedApi(`/api/conversations/${conversationId}/messages/${messageId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  // ============ Push Tokens ============

  test("Register device push token", async () => {
    const res = await authenticatedApi("/api/push-tokens", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "device_token_ios_test_123",
        platform: "ios",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Register Android push token", async () => {
    const res = await authenticatedApi("/api/push-tokens", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "device_token_android_test_456",
        platform: "android",
      }),
    });
    await expectStatus(res, 200);
  });

  test("Delete push token", async () => {
    const res = await authenticatedApi("/api/push-tokens/device_token_ios_test_123", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Delete non-existent push token returns 200", async () => {
    const res = await authenticatedApi("/api/push-tokens/non_existent_token", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
  });

  // ============ OneSignal ============

  test("Register OneSignal player ID", async () => {
    const res = await authenticatedApi("/api/onesignal/register", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: "onesignal_player_id_test_123",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  // ============ Share ============

  test("Get share info for sublet post", async () => {
    const createRes = await authenticatedApi("/api/sublets", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        title: "Share test sublet",
        city: "Hamburg",
        availableFrom: "2026-09-01",
        availableTo: "2026-11-30",
        rent: "1200",
        independentArrangementConsent: true,
      }),
    });
    const createData = await createRes.json();
    const postId = createData.id;

    const res = await api(`/api/posts/sublet/${postId}/share`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.shareUrl).toBeDefined();
    expect(data.title).toBeDefined();
  });

  test("Get share info for travel post", async () => {
    const createRes = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        fromCity: "Stuttgart",
        toCity: "Frankfurt",
        travelDate: "2026-09-15",
        companionshipConsent: true,
      }),
    });
    const createData = await createRes.json();
    const postId = createData.id || createData.travelPostId;

    const res = await api(`/api/posts/travel/${postId}/share`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.shareUrl).toBeDefined();
    expect(data.title).toBeDefined();
  });

  test("Get share for non-existent post returns 404", async () => {
    const res = await api("/api/posts/sublet/00000000-0000-0000-0000-000000000000/share");
    await expectStatus(res, 404);
  });

  test("Get share for post with invalid UUID format returns 400", async () => {
    const res = await api("/api/posts/sublet/invalid-uuid/share");
    await expectStatus(res, 400);
  });

  // ============ File Upload ============

  test("Upload images for sublet/travel post", async () => {
    const form = new FormData();
    form.append("file", createTestFile("test-image.jpg", "fake image data", "image/jpeg"));

    const res = await authenticatedApi("/api/upload/images", authToken, {
      method: "POST",
      body: form,
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.urls)).toBe(true);
  });

  test("Upload profile photo", async () => {
    const form = new FormData();
    form.append("file", createTestFile("profile.jpg", "profile image data", "image/jpeg"));

    const res = await authenticatedApi("/api/upload/profile-photo", authToken, {
      method: "POST",
      body: form,
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.url).toBeDefined();
  });

  // ============ WebSocket ============

  test("Connect to WebSocket messages endpoint", async () => {
    const ws = await connectAuthenticatedWebSocket("/ws/messages", authToken);
    expect(ws).toBeDefined();
    expect(ws.readyState).toBe(1); // OPEN
    ws.close();
  });

  // ============ General ============

  test("Get terms and conditions", async () => {
    const res = await api("/api/terms-and-conditions");
    await expectStatus(res, 200);
  });
});
