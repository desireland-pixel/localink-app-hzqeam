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

  test("Check username availability - missing username param returns 400", async () => {
    const res = await api("/api/check-username");
    await expectStatus(res, 400);
  });

  test("Password reset redirect with invalid token returns 400", async () => {
    const res = await api("/api/auth/reset-redirect?token=invalid-token&email=test@example.com");
    await expectStatus(res, 400);
  });

  test("Password reset redirect with missing email returns 400", async () => {
    const res = await api("/api/auth/reset-redirect?token=00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 400);
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

  test("Accept disclaimer with missing type returns 400", async () => {
    const res = await authenticatedApi("/api/profile/disclaimers", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("Change password with wrong old password returns 400", async () => {
    const res = await authenticatedApi("/api/profile/change-password", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oldPassword: "WrongPassword123!",
        newPassword: "NewPassword456!",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Change password missing required fields returns 400", async () => {
    const res = await authenticatedApi("/api/profile/change-password", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing oldPassword and newPassword
      }),
    });
    await expectStatus(res, 400);
  });

  test("Request password reset - user not found returns 404", async () => {
    const res = await api("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nonexistent@example.com",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Request password reset - invalid email format returns 400", async () => {
    const res = await api("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "not-an-email",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Request password reset missing email returns 400", async () => {
    const res = await api("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("Reset password with invalid token returns 400", async () => {
    const res = await api("/api/auth/do-reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "invalid-token",
        newPassword: "NewPassword123!",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Reset password missing required fields returns 400", async () => {
    const res = await api("/api/auth/do-reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing token and newPassword
      }),
    });
    await expectStatus(res, 400);
  });

  test("Verify OTP with invalid email format returns 400", async () => {
    const res = await api("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "invalid-email",
        otp: "123456",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Verify OTP missing required fields returns 400", async () => {
    const res = await api("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing email and otp
      }),
    });
    await expectStatus(res, 400);
  });

  test("Resend OTP with invalid email format returns 400", async () => {
    const res = await api("/api/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "not-a-valid-email",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Resend OTP missing email returns 400", async () => {
    const res = await api("/api/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing email
      }),
    });
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

  test("Get all type cities", async () => {
    const res = await api("/api/cities?type=all");
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

  test("Search cities with type filter", async () => {
    const res = await api("/api/cities/search?q=Berlin&type=all");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.cities)).toBe(true);
  });

  test("Search cities with travel type filter", async () => {
    const res = await api("/api/cities/search?q=Berlin&type=travel");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.cities)).toBe(true);
  });

  test("Search cities with empty query", async () => {
    const res = await api("/api/cities/search");
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
        availableFrom: "2026-06-15",
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

  test("Create sublet (seeking type)", async () => {
    const res = await authenticatedApi("/api/sublets", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "seeking",
        title: "Looking for apartment in Berlin",
        city: "Berlin",
        availableFrom: "2026-06-15",
        availableTo: "2026-09-30",
        rent: "1200",
        independentArrangementConsent: true,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBeDefined();
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

  test("Get sublets filtered by type seeking", async () => {
    const res = await api("/api/sublets?type=seeking");
    await expectStatus(res, 200);
  });

  test("Get sublets with date range filter", async () => {
    const res = await api("/api/sublets?availableFrom=2026-06-01&availableTo=2026-08-31");
    await expectStatus(res, 200);
  });

  test("Get sublets with rent filter", async () => {
    const res = await api("/api/sublets?minRent=500&maxRent=2000");
    await expectStatus(res, 200);
  });

  test("Get sublets filtered by city registration required", async () => {
    const res = await api("/api/sublets?cityRegistrationRequired=yes");
    await expectStatus(res, 200);
  });

  test("Get sublets sorted by newest", async () => {
    const res = await api("/api/sublets?sort=newest");
    await expectStatus(res, 200);
  });

  test("Get sublets sorted by cheapest", async () => {
    const res = await api("/api/sublets?sort=cheapest");
    await expectStatus(res, 200);
  });

  test("Get sublets sorted by earliest", async () => {
    const res = await api("/api/sublets?sort=earliest");
    await expectStatus(res, 200);
  });

  test("Get sublets with pagination", async () => {
    const res = await api("/api/sublets?limit=5&offset=0");
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
        title: "Updated: Premium Munich Apartment",
        rent: "1800",
        description: "Updated description with more details",
      }),
    });
    await expectStatus(res, 200);
  });

  test("Update sublet - deposit field", async () => {
    const res = await authenticatedApi(`/api/sublets/${subletId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deposit: "500",
      }),
    });
    await expectStatus(res, 200);
  });

  test("Update non-existent sublet returns 404", async () => {
    const res = await authenticatedApi("/api/sublets/00000000-0000-0000-0000-000000000000", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated title",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Update sublet with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/sublets/invalid-uuid", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated title",
      }),
    });
    await expectStatus(res, 400);
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

  test("Close non-existent sublet returns 404", async () => {
    const res = await authenticatedApi("/api/sublets/00000000-0000-0000-0000-000000000000/close", authToken, {
      method: "PATCH",
    });
    await expectStatus(res, 404);
  });

  test("Delete own sublet", async () => {
    const res = await authenticatedApi(`/api/sublets/${subletId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
  });

  test("Verify deleted sublet returns 404", async () => {
    const res = await api(`/api/sublets/${subletId}`);
    await expectStatus(res, 404);
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

  test("Create travel post (seeking type)", async () => {
    const res = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "seeking",
        fromCity: "Hamburg",
        toCity: "Berlin",
        travelDate: "2026-08-01",
        seekingConsent: true,
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id || data.travelPostId).toBeDefined();
  });

  test("Create travel post with companionship info", async () => {
    const res = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "seeking",
        fromCity: "Munich",
        toCity: "Hamburg",
        travelDate: "2026-08-15",
        companionshipFor: "Mother",
        canOfferCompanionship: true,
        seekingConsent: true,
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id || data.travelPostId).toBeDefined();
  });

  test("Create travel post with item carrying", async () => {
    const res = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        fromCity: "Berlin",
        toCity: "Hamburg",
        travelDate: "2026-09-01",
        canCarryItems: true,
        item: "Laptop and documents",
        companionshipConsent: true,
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id || data.travelPostId).toBeDefined();
  });

  test("Create travel post with incentive amount", async () => {
    const res = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "seeking",
        fromCity: "Munich",
        toCity: "Berlin",
        travelDate: "2026-09-10",
        incentiveAmount: 50.00,
        seekingConsent: true,
      }),
    });
    await expectStatus(res, 201);
  });

  test("Get all travel posts", async () => {
    const res = await api("/api/travel-posts");
    await expectStatus(res, 200);
  });

  test("Get travel posts filtered by cities", async () => {
    const res = await api("/api/travel-posts?fromCity=Berlin&toCity=Munich");
    await expectStatus(res, 200);
  });

  test("Get travel posts filtered by role offering", async () => {
    const res = await api("/api/travel-posts?role=offering");
    await expectStatus(res, 200);
  });

  test("Get travel posts filtered by role seeking", async () => {
    const res = await api("/api/travel-posts?role=seeking");
    await expectStatus(res, 200);
  });

  test("Get travel posts filtered by date range", async () => {
    const res = await api("/api/travel-posts?travelDateFrom=2026-06-01&travelDateTo=2026-08-31");
    await expectStatus(res, 200);
  });

  test("Get travel posts filtered by travel date", async () => {
    const res = await api("/api/travel-posts?travelDate=2026-07-15");
    await expectStatus(res, 200);
  });

  test("Get travel posts filtered by incentive true", async () => {
    const res = await api("/api/travel-posts?incentive=true");
    await expectStatus(res, 200);
  });

  test("Get travel posts filtered by incentive false", async () => {
    const res = await api("/api/travel-posts?incentive=false");
    await expectStatus(res, 200);
  });

  test("Get travel posts sorted by newest", async () => {
    const res = await api("/api/travel-posts?sort=newest");
    await expectStatus(res, 200);
  });

  test("Get travel posts sorted by earliest-departure", async () => {
    const res = await api("/api/travel-posts?sort=earliest-departure");
    await expectStatus(res, 200);
  });

  test("Get travel posts sorted by latest-departure", async () => {
    const res = await api("/api/travel-posts?sort=latest-departure");
    await expectStatus(res, 200);
  });

  test("Get travel posts with pagination", async () => {
    const res = await api("/api/travel-posts?limit=10&offset=0");
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

  test("Update travel post with incentive", async () => {
    const res = await authenticatedApi(`/api/travel-posts/${travelPostId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incentiveAmount: 75.50,
      }),
    });
    await expectStatus(res, 200);
  });

  test("Update non-existent travel post returns 404", async () => {
    const res = await authenticatedApi("/api/travel-posts/00000000-0000-0000-0000-000000000000", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Updated",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Update travel post with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/travel-posts/invalid-uuid", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Updated",
      }),
    });
    await expectStatus(res, 400);
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

  test("Close non-existent travel post returns 404", async () => {
    const res = await authenticatedApi("/api/travel-posts/00000000-0000-0000-0000-000000000000/close", authToken, {
      method: "PATCH",
    });
    await expectStatus(res, 404);
  });

  test("Delete own travel post", async () => {
    const res = await authenticatedApi(`/api/travel-posts/${travelPostId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
  });

  test("Verify deleted travel post returns 404", async () => {
    const res = await api(`/api/travel-posts/${travelPostId}`);
    await expectStatus(res, 404);
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

  test("Create travel post with invalid incentive amount returns 400", async () => {
    const res = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        fromCity: "Berlin",
        toCity: "Munich",
        travelDate: "2026-09-01",
        incentiveAmount: 150.00, // Exceeds max of 99.99
        companionshipConsent: true,
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create travel post with zero incentive amount returns 400", async () => {
    const res = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        fromCity: "Berlin",
        toCity: "Munich",
        travelDate: "2026-09-01",
        incentiveAmount: 0,
        companionshipConsent: true,
      }),
    });
    await expectStatus(res, 400);
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
        travelDate: "2026-06-15",
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

  test("Create favorite with invalid postType returns 400", async () => {
    const createRes = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "seeking",
        fromCity: "Berlin",
        toCity: "Hamburg",
        travelDate: "2026-06-15",
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
        postType: "invalid",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create favorite missing postId returns 400", async () => {
    const res = await authenticatedApi("/api/favorites", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postType: "travel",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Get user favorites with pagination", async () => {
    const res = await authenticatedApi("/api/favorites", authToken);
    await expectStatus(res, 200);
  });

  test("Get favorites with limit and offset", async () => {
    const res = await authenticatedApi("/api/favorites?limit=10&offset=0", authToken);
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

  test("Check if post is favorited with invalid postType returns 400", async () => {
    const res = await authenticatedApi("/api/favorites/check/00000000-0000-0000-0000-000000000000?postType=invalid", authToken);
    await expectStatus(res, 400);
  });

  test("Check if post is favorited missing postType returns 400", async () => {
    const res = await authenticatedApi("/api/favorites/check/00000000-0000-0000-0000-000000000000", authToken);
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

  test("Delete favorite with invalid postType returns 400", async () => {
    const res = await authenticatedApi("/api/favorites/00000000-0000-0000-0000-000000000000?postType=invalid", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 400);
  });

  test("Delete favorite missing postType returns 400", async () => {
    const res = await authenticatedApi("/api/favorites/00000000-0000-0000-0000-000000000000", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 400);
  });

  test("Create favorite on sublet post", async () => {
    const createRes = await authenticatedApi("/api/sublets", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        title: "Favorite test sublet",
        city: "Vienna",
        availableFrom: "2026-06-15",
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
        availableFrom: "2026-06-15",
        availableTo: "2026-07-30",
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
        city: "Munich",
        availableFrom: "2026-06-15",
        availableTo: "2026-07-30",
        rent: "1200",
        independentArrangementConsent: true,
      }),
    });
    await expectStatus(createRes, 200);
    const createData = await createRes.json();
    const subletId = createData.id;
    expect(subletId).toBeDefined();

    const favRes = await authenticatedApi("/api/favorites", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: subletId,
        postType: "sublet",
      }),
    });
    await expectStatus(favRes, 201);

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

  test("Get community topics filtered by category", async () => {
    const res = await api("/api/community/topics?category=Housing");
    await expectStatus(res, 200);
  });

  test("Get community topics filtered by status open", async () => {
    const res = await api("/api/community/topics?status=open");
    await expectStatus(res, 200);
  });

  test("Get community topics filtered by status closed", async () => {
    const res = await api("/api/community/topics?status=closed");
    await expectStatus(res, 200);
  });

  test("Get community topics with pagination", async () => {
    const res = await api("/api/community/topics?limit=5&offset=0");
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

  test("Update community topic status to closed", async () => {
    const res = await authenticatedApi(`/api/community/topics/${communityTopicId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "closed",
      }),
    });
    await expectStatus(res, 200);
  });

  test("Update non-existent community topic returns 404", async () => {
    const res = await authenticatedApi("/api/community/topics/00000000-0000-0000-0000-000000000000", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated title",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Update topic with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/community/topics/invalid-uuid", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated title",
      }),
    });
    await expectStatus(res, 400);
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

  test("Create reply to non-existent topic returns 404", async () => {
    const res = await authenticatedApi("/api/community/topics/00000000-0000-0000-0000-000000000000/replies", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "This reply should fail because the topic doesn't exist.",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Create reply with invalid topic UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/community/topics/invalid-uuid/replies", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Test reply",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create reply missing content returns 400", async () => {
    const res = await authenticatedApi(`/api/community/topics/${communityTopicId}/replies`, authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing required: content
      }),
    });
    await expectStatus(res, 400);
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

  test("Update non-existent community reply returns 404", async () => {
    const res = await authenticatedApi("/api/community/replies/00000000-0000-0000-0000-000000000000", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Updated content",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Update reply with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/community/replies/invalid-uuid", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Updated content",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Update reply missing content returns 400", async () => {
    const res = await authenticatedApi(`/api/community/replies/${replyId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing required: content
      }),
    });
    await expectStatus(res, 400);
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

  test("Like non-existent community reply returns 404", async () => {
    const res = await authenticatedApi("/api/community/replies/00000000-0000-0000-0000-000000000000/like", authToken, {
      method: "POST",
    });
    await expectStatus(res, 404);
  });

  test("Like reply with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/community/replies/invalid-uuid/like", authToken, {
      method: "POST",
    });
    await expectStatus(res, 400);
  });

  test("Get unread replies count for topic", async () => {
    const res = await authenticatedApi(`/api/community/topics/${communityTopicId}/unread-replies`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.unreadCount).toBe("number");
  });

  test("Get unread replies for non-existent topic returns 404", async () => {
    const res = await authenticatedApi("/api/community/topics/00000000-0000-0000-0000-000000000000/unread-replies", authToken);
    await expectStatus(res, 404);
  });

  test("Get unread replies with invalid topic UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/community/topics/invalid-uuid/unread-replies", authToken);
    await expectStatus(res, 400);
  });

  test("Mark all replies as read for topic", async () => {
    const res = await authenticatedApi(`/api/community/topics/${communityTopicId}/mark-replies-read`, authToken, {
      method: "POST",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Mark replies as read for non-existent topic returns 404", async () => {
    const res = await authenticatedApi("/api/community/topics/00000000-0000-0000-0000-000000000000/mark-replies-read", authToken, {
      method: "POST",
    });
    await expectStatus(res, 404);
  });

  test("Mark replies as read with invalid topic UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/community/topics/invalid-uuid/mark-replies-read", authToken, {
      method: "POST",
    });
    await expectStatus(res, 400);
  });

  test("Delete own community reply", async () => {
    const res = await authenticatedApi(`/api/community/replies/${replyId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
  });

  test("Delete non-existent community reply returns 404", async () => {
    const res = await authenticatedApi("/api/community/replies/00000000-0000-0000-0000-000000000000", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 404);
  });

  test("Delete reply with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/community/replies/invalid-uuid", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 400);
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
    // Create a fresh topic for this test since communityTopicId is already closed
    const createRes = await authenticatedApi("/api/community/topics", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "General",
        title: "Topic to close for test",
        description: "Test closing topic",
        location: "Berlin",
      }),
    });
    const createData = await createRes.json();
    const topicToCloseId = createData.id;

    const res = await authenticatedApi(`/api/community/topics/${topicToCloseId}/close`, authToken, {
      method: "POST",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Close non-existent community topic returns 404", async () => {
    const res = await authenticatedApi("/api/community/topics/00000000-0000-0000-0000-000000000000/close", authToken, {
      method: "POST",
    });
    await expectStatus(res, 404);
  });

  test("Close topic with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/community/topics/invalid-uuid/close", authToken, {
      method: "POST",
    });
    await expectStatus(res, 400);
  });

  test("Delete community topic", async () => {
    const res = await authenticatedApi(`/api/community/topics/${communityTopicId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
  });

  test("Verify deleted community topic returns 404", async () => {
    const res = await api(`/api/community/topics/${communityTopicId}`);
    await expectStatus(res, 404);
  });

  test("Delete community topic by invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/community/topics/invalid-uuid", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 400);
  });

  test("Delete non-existent community topic returns 404", async () => {
    const res = await authenticatedApi("/api/community/topics/00000000-0000-0000-0000-000000000000", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 404);
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

  test("Get community posts with sorting newest", async () => {
    const res = await api("/api/community-posts?sort=newest");
    await expectStatus(res, 200);
  });

  test("Get community posts sorted by trending", async () => {
    const res = await api("/api/community-posts?sort=trending");
    await expectStatus(res, 200);
  });

  test("Get community posts sorted by oldest", async () => {
    const res = await api("/api/community-posts?sort=oldest");
    await expectStatus(res, 200);
  });

  test("Get community posts with pagination", async () => {
    const res = await api("/api/community-posts?limit=5&offset=0");
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

  test("Get comments for non-existent post returns 404", async () => {
    const res = await api("/api/community/00000000-0000-0000-0000-000000000000/comments");
    await expectStatus(res, 404);
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

  test("Add comment to non-existent post returns 404", async () => {
    const res = await authenticatedApi("/api/community/00000000-0000-0000-0000-000000000000/comments", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "This comment should fail because the post doesn't exist.",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Add comment with invalid post UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/community/invalid-uuid/comments", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Test comment",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Add comment missing content returns 400", async () => {
    const topicRes = await authenticatedApi("/api/community/topics", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "General",
        title: "Topic for test missing content",
        description: "Test topic",
        location: "Berlin",
      }),
    });
    const topicData = await topicRes.json();
    const topicId = topicData.id;

    const res = await authenticatedApi(`/api/community/${topicId}/comments`, authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing required: content
      }),
    });
    await expectStatus(res, 400);
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

  test("Start conversation on sublet post", async () => {
    const postRes = await authenticatedApi("/api/sublets", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        title: "Conversation test sublet",
        city: "Hamburg",
        availableFrom: "2026-06-15",
        availableTo: "2026-08-31",
        rent: "1500",
        independentArrangementConsent: true,
      }),
    });
    const postData = await postRes.json();
    const postId = postData.id;

    const res = await authenticatedApi("/api/conversations", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        postType: "sublet",
        recipientId: authUser.id,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBeDefined();
  });

  test("Start conversation on community post", async () => {
    const postRes = await authenticatedApi("/api/community/topics", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "General",
        title: "Conversation test community topic",
        description: "Testing conversation on community post",
        location: "Berlin",
      }),
    });
    const postData = await postRes.json();
    const postId = postData.id;

    const res = await authenticatedApi("/api/conversations", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        postType: "community",
        recipientId: authUser.id,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBeDefined();
  });

  test("Start conversation missing required fields fails", async () => {
    const res = await authenticatedApi("/api/conversations", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing required: postId, postType, recipientId
      }),
    });
    await expectStatus(res, 400);
  });

  test("Get conversation by ID", async () => {
    if (!conversationId) {
      // Create conversation if not exists
      const postRes = await authenticatedApi("/api/travel-posts", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "offering",
          fromCity: "Leipzig",
          toCity: "Cologne",
          travelDate: "2026-09-10",
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

    const res = await authenticatedApi(`/api/conversations/${conversationId}`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.conversation).toBeDefined();
  });

  test("Get non-existent conversation returns 404", async () => {
    const res = await authenticatedApi("/api/conversations/00000000-0000-0000-0000-000000000000", authToken);
    await expectStatus(res, 404);
  });

  test("Get conversation by invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/conversations/invalid-uuid", authToken);
    await expectStatus(res, 400);
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

  test("Send message missing required content fails", async () => {
    if (!conversationId) {
      const postRes = await authenticatedApi("/api/travel-posts", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "seeking",
          fromCity: "Dresden",
          toCity: "Leipzig",
          travelDate: "2026-10-05",
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
        // Missing required: content
      }),
    });
    await expectStatus(res, 400);
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

  test("Get messages with pagination", async () => {
    if (!conversationId) {
      const postRes = await authenticatedApi("/api/travel-posts", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "offering",
          fromCity: "Munich",
          toCity: "Stuttgart",
          travelDate: "2026-12-10",
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

    const res = await authenticatedApi(`/api/conversations/${conversationId}/messages?limit=10&offset=0`, authToken);
    await expectStatus(res, 200);
  });

  test("Get messages for non-existent conversation returns 404", async () => {
    const res = await authenticatedApi("/api/conversations/00000000-0000-0000-0000-000000000000/messages", authToken);
    await expectStatus(res, 404);
  });

  test("Get messages with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/conversations/invalid-uuid/messages", authToken);
    await expectStatus(res, 400);
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
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.markedCount).toBe("number");
  });

  test("Mark read on non-existent conversation returns 404", async () => {
    const res = await authenticatedApi("/api/conversations/00000000-0000-0000-0000-000000000000/mark-read", authToken, {
      method: "POST",
    });
    await expectStatus(res, 404);
  });

  test("Delete a conversation", async () => {
    // Create a new conversation specifically for deletion test
    const postRes = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        fromCity: "Berlin",
        toCity: "Munich",
        travelDate: "2027-03-15",
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
    await expectStatus(convRes, 200);
    const convData = await convRes.json();
    const convToDeleteId = convData.id;

    const res = await authenticatedApi(`/api/conversations/${convToDeleteId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Delete non-existent conversation returns 404", async () => {
    const res = await authenticatedApi("/api/conversations/00000000-0000-0000-0000-000000000000", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 404);
  });

  test("Delete conversation with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/conversations/invalid-uuid", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 400);
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

  test("Delete message from non-existent conversation returns 404", async () => {
    const res = await authenticatedApi("/api/conversations/00000000-0000-0000-0000-000000000000/messages/00000000-0000-0000-0000-000000000001", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 404);
  });

  test("Delete message with invalid conversation UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/conversations/invalid-uuid/messages/00000000-0000-0000-0000-000000000001", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 400);
  });

  test("Delete message with invalid message UUID format returns 400", async () => {
    if (!conversationId) {
      const postRes = await authenticatedApi("/api/travel-posts", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "offering",
          fromCity: "Cologne",
          toCity: "Frankfurt",
          travelDate: "2027-02-15",
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

    const res = await authenticatedApi(`/api/conversations/${conversationId}/messages/invalid-uuid`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 400);
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
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Register push token missing platform returns 400", async () => {
    const res = await authenticatedApi("/api/push-tokens", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "test_token",
        // Missing platform
      }),
    });
    await expectStatus(res, 400);
  });

  test("Register push token missing token returns 400", async () => {
    const res = await authenticatedApi("/api/push-tokens", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "ios",
        // Missing token
      }),
    });
    await expectStatus(res, 400);
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

  test("Get share info for community post", async () => {
    const createRes = await authenticatedApi("/api/community/topics", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "General",
        title: "Share test community topic",
        description: "Testing share functionality for community post",
        location: "Berlin",
      }),
    });
    const createData = await createRes.json();
    const postId = createData.id;

    const res = await api(`/api/posts/community/${postId}/share`);
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

  // ============ Notification Preferences ============

  test("Get notification preferences for authenticated user", async () => {
    const res = await authenticatedApi("/api/notification-preferences", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.notifyEmail).toBe("boolean");
    expect(typeof data.notifyPush).toBe("boolean");
    expect(typeof data.notifyMessages).toBe("boolean");
    expect(typeof data.notifyPosts).toBe("boolean");
  });

  test("Get notification preferences without authentication returns 401", async () => {
    const res = await api("/api/notification-preferences");
    await expectStatus(res, 401);
  });

  test("Update notification preferences - enable all notifications", async () => {
    const res = await authenticatedApi("/api/notification-preferences", authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notifyEmail: true,
        notifyPush: true,
        notifyMessages: true,
        notifyPosts: true,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.notifyEmail).toBe(true);
    expect(data.notifyPush).toBe(true);
    expect(data.notifyMessages).toBe(true);
    expect(data.notifyPosts).toBe(true);
  });

  test("Update notification preferences - partial update", async () => {
    const res = await authenticatedApi("/api/notification-preferences", authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notifyEmail: false,
        notifyPush: true,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.notifyEmail).toBe("boolean");
    expect(typeof data.notifyPush).toBe("boolean");
  });

  test("Update notification preferences without authentication returns 401", async () => {
    const res = await api("/api/notification-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notifyEmail: false,
      }),
    });
    await expectStatus(res, 401);
  });

  // ============ User Account Management ============

  test("Schedule account deletion", async () => {
    const res = await authenticatedApi("/api/user/delete-account", authToken, {
      method: "POST",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBeDefined();
  });

  test("Schedule account deletion without auth returns 401", async () => {
    const res = await api("/api/user/delete-account", {
      method: "POST",
    });
    await expectStatus(res, 401);
  });

  test("Cancel account deletion", async () => {
    // First schedule deletion
    await authenticatedApi("/api/user/delete-account", authToken, {
      method: "POST",
    });

    // Then cancel it
    const res = await authenticatedApi("/api/user/cancel-delete-account", authToken, {
      method: "POST",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBeDefined();
  });

  test("Cancel account deletion without authentication returns 401", async () => {
    const res = await api("/api/user/cancel-delete-account", {
      method: "POST",
    });
    await expectStatus(res, 401);
  });

  // ============ Matches ============

  test("Get current user's match notifications", async () => {
    const res = await authenticatedApi("/api/matches", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("Get matches with pagination", async () => {
    const res = await authenticatedApi("/api/matches?limit=10&offset=0", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("Trigger matching for a sublet post", async () => {
    // Create a sublet to trigger matching on
    const createRes = await authenticatedApi("/api/sublets", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        title: "Match trigger test sublet",
        city: "Berlin",
        availableFrom: "2026-06-15",
        availableTo: "2026-08-31",
        rent: "1500",
        independentArrangementConsent: true,
      }),
    });
    await expectStatus(createRes, 200);
    const createData = await createRes.json();
    const postId = createData.id;

    const res = await authenticatedApi("/api/matches/trigger", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        postType: "sublet",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBeDefined();
  });

  test("Trigger matching for a travel post", async () => {
    // Create a travel post to trigger matching on
    const createRes = await authenticatedApi("/api/travel-posts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        fromCity: "Stuttgart",
        toCity: "Frankfurt",
        travelDate: "2026-07-15",
        companionshipConsent: true,
      }),
    });
    await expectStatus(createRes, 201);
    const createData = await createRes.json();
    const postId = createData.id || createData.travelPostId;

    const res = await authenticatedApi("/api/matches/trigger", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        postType: "travel",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Trigger matching missing postType returns 400", async () => {
    const createRes = await authenticatedApi("/api/sublets", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        title: "Trigger match test",
        city: "Munich",
        availableFrom: "2026-07-01",
        availableTo: "2026-08-30",
        rent: "1500",
        independentArrangementConsent: true,
      }),
    });
    const createData = await createRes.json();
    const postId = createData.id;

    const res = await authenticatedApi("/api/matches/trigger", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        // Missing postType
      }),
    });
    await expectStatus(res, 400);
  });

  test("Trigger matching missing postId returns 400", async () => {
    const res = await authenticatedApi("/api/matches/trigger", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postType: "sublet",
        // Missing postId
      }),
    });
    await expectStatus(res, 400);
  });

  // ============ Admin Endpoints ============

  test("Admin push notification endpoint requires authorization", async () => {
    const res = await api("/api/admin/notifications/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Notification",
        message: "This is a test",
      }),
    });
    await expectStatus(res, 401, 403);
  });

  test("Admin email notification endpoint requires authorization", async () => {
    const res = await api("/api/admin/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Test Email",
        body: "This is a test email",
      }),
    });
    await expectStatus(res, 401, 403);
  });

  // ============ Posts Outcome ============

  test("Submit post outcome - yes", async () => {
    // Create a sublet post to submit outcome for
    const createRes = await authenticatedApi("/api/sublets", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offering",
        title: "Outcome test sublet",
        city: "Berlin",
        availableFrom: "2026-06-15",
        availableTo: "2026-08-31",
        rent: "1500",
        independentArrangementConsent: true,
      }),
    });
    await expectStatus(createRes, 200);
    const createData = await createRes.json();
    const postId = createData.id;

    const res = await authenticatedApi("/api/posts/outcome", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        postType: "sublet",
        outcome: "yes",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Submit post outcome - no with comment", async () => {
    // Create a travel post to submit outcome for
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
    await expectStatus(createRes, 201);
    const createData = await createRes.json();
    const postId = createData.id || createData.travelPostId;

    const res = await authenticatedApi("/api/posts/outcome", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        postType: "travel",
        outcome: "no",
        comment: "Found another travel companion",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Submit post outcome for community post", async () => {
    // Create a community topic to submit outcome for
    const createRes = await authenticatedApi("/api/community/topics", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "General",
        title: "Outcome test community topic",
        description: "Testing post outcome on community",
        location: "Berlin",
      }),
    });
    await expectStatus(createRes, 200);
    const createData = await createRes.json();
    const postId = createData.id;

    const res = await authenticatedApi("/api/posts/outcome", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        postType: "community",
        outcome: "yes",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Submit post outcome missing postId returns 400", async () => {
    const res = await authenticatedApi("/api/posts/outcome", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postType: "sublet",
        outcome: "yes",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Submit post outcome missing postType returns 400", async () => {
    const res = await authenticatedApi("/api/posts/outcome", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: "00000000-0000-0000-0000-000000000000",
        outcome: "yes",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Submit post outcome missing outcome returns 400", async () => {
    const res = await authenticatedApi("/api/posts/outcome", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: "00000000-0000-0000-0000-000000000000",
        postType: "sublet",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Submit post outcome with invalid postType returns 400", async () => {
    const res = await authenticatedApi("/api/posts/outcome", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: "00000000-0000-0000-0000-000000000000",
        postType: "invalid",
        outcome: "yes",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Submit post outcome with invalid outcome value returns 400", async () => {
    const res = await authenticatedApi("/api/posts/outcome", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: "00000000-0000-0000-0000-000000000000",
        postType: "sublet",
        outcome: "maybe",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Submit post outcome without authentication returns 401", async () => {
    const res = await api("/api/posts/outcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: "00000000-0000-0000-0000-000000000000",
        postType: "sublet",
        outcome: "yes",
      }),
    });
    await expectStatus(res, 401);
  });

  // ============ Feedback ============

  test("Submit feedback with general category", async () => {
    const res = await authenticatedApi("/api/feedback", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "general",
        message: "This is a great app!",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.created_at).toBeDefined();
  });

  test("Submit feedback with bug category", async () => {
    const res = await authenticatedApi("/api/feedback", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "bug",
        message: "I found a bug in the chat feature.",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
  });

  test("Submit feedback with feature category", async () => {
    const res = await authenticatedApi("/api/feedback", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "feature",
        message: "It would be nice to have a dark mode.",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
  });

  test("Submit feedback missing category returns 400", async () => {
    const res = await authenticatedApi("/api/feedback", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing category
        message: "Some feedback",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Submit feedback missing message returns 400", async () => {
    const res = await authenticatedApi("/api/feedback", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "general",
        // Missing message
      }),
    });
    await expectStatus(res, 400);
  });

  test("Submit feedback with invalid category returns 400", async () => {
    const res = await authenticatedApi("/api/feedback", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "invalid",
        message: "Some feedback",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Submit feedback without authentication returns 401", async () => {
    const res = await api("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "general",
        message: "Some feedback",
      }),
    });
    await expectStatus(res, 401);
  });

  // ============ General ============

  test("Get terms and conditions", async () => {
    const res = await api("/api/terms-and-conditions");
    await expectStatus(res, 200);
  });
});
