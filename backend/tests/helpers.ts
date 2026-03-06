import { afterAll } from "bun:test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

/**
 * Strip Content-Type: application/json when there's no body.
 */
function sanitizeOptions(options?: RequestInit): RequestInit | undefined {
  if (!options?.headers || options.body) return options;
  const headers = new Headers(options.headers);
  if (headers.get("content-type")?.includes("application/json")) {
    headers.delete("content-type");
  }
  const entries = [...headers.entries()];
  return {
    ...options,
    headers: entries.length > 0 ? Object.fromEntries(entries) : undefined,
  };
}

/**
 * Make a request to the API under test.
 */
export async function api(
  path: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, sanitizeOptions(options));
}

/**
 * Make an authenticated request to the API under test.
 */
export async function authenticatedApi(
  path: string,
  token: string,
  options?: RequestInit
): Promise<Response> {
  const sanitized = sanitizeOptions(options);
  return fetch(`${BASE_URL}${path}`, {
    ...sanitized,
    headers: {
      ...sanitized?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

export interface TestUser {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Sign up a test user and return the token and user object.
 */
export async function signUpTestUser(): Promise<TestUser> {
  const id = crypto.randomUUID();
  const email = `testuser+${id}@example.com`;

  // First, sign up with the custom signup endpoint
  const signupRes = await api("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User",
      email: email,
      password: "TestPassword123!",
      username: `testuser_${id.substring(0, 8)}`,
      city: "Berlin",
      termsAccepted: true,
    }),
  });

  if (!signupRes.ok) {
    const body = await signupRes.text();
    throw new Error(`Failed to sign up test user (${signupRes.status}): ${body}`);
  }

  const signupData = (await signupRes.json()) as any;

  // For testing, we'll try logging in directly
  // The signup creates the user but email is not verified yet
  // However, for testing purposes, we'll allow login to work with a test user
  const loginRes = await api("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email,
      password: "TestPassword123!",
    }),
  });

  if (!loginRes.ok) {
    const body = await loginRes.text();
    // If login fails due to unverified email, we might need to verify OTP first
    // For now, throw the error so we know what's happening
    throw new Error(`Failed to login test user (${loginRes.status}): ${body}`);
  }

  const loginData = (await loginRes.json()) as any;

  // Extract token from session
  const token = loginData.session?.id || loginData.token || id;

  if (!token) {
    throw new Error("No session token returned from login");
  }

  // Construct a test user object
  const testUser: TestUser = {
    token,
    user: {
      id: loginData.user?.id || loginData.userId || id,
      name: "Test User",
      email: email,
      emailVerified: loginData.user?.emailVerified ?? true,
      image: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  // Auto-register cleanup so the test file doesn't need to
  afterAll(async () => {
    await deleteTestUser(token);
  });

  return testUser;
}

/**
 * Assert response status and include response body in error on mismatch.
 * Use instead of expect(res.status).toBe(x) for better error messages.
 */
export async function expectStatus(res: Response, ...expected: number[]): Promise<void> {
  if (!expected.includes(res.status)) {
    let body = await res.clone().text().catch(() => "(unable to read body)");
    if (body.length > 500) body = body.slice(0, 500) + "...";
    const path = new URL(res.url).pathname + new URL(res.url).search;
    console.error(`${path} — Expected ${expected.join("|")}, got ${res.status} — ${body}`);
    throw ``;
  }
}

/**
 * Delete the test user (cleanup).
 */
export async function deleteTestUser(token: string): Promise<void> {
  await authenticatedApi("/api/auth/delete-user", token, {
    method: "POST",
  });
}

/**
 * Create a dummy file for multipart upload testing.
 * Returns a File object that can be appended to FormData.
 */
export function createTestFile(filename = "test.txt", content = "test file content", type = "text/plain"): File {
  return new File([content], filename, { type });
}

const WS_URL = BASE_URL.replace(/^http/, "ws");

/**
 * Connect to a WebSocket endpoint. Resolves when the connection is open.
 */
export async function connectWebSocket(path: string): Promise<WebSocket> {
  const url = new URL(path, WS_URL);
  const ws = new WebSocket(url.toString());
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve(ws);
    ws.onerror = () => reject(new Error(`WebSocket connection failed: ${url}`));
    setTimeout(() => { ws.close(); reject(new Error("WebSocket connection timeout")); }, 5000);
  });
}

/**
 * Connect to an authenticated WebSocket endpoint.
 * Uses Bearer token in Authorization header for authentication.
 */
export async function connectAuthenticatedWebSocket(path: string, token: string): Promise<WebSocket> {
  const url = new URL(path, WS_URL);
  // Pass token as query parameter as fallback
  url.searchParams.set('token', token);

  // Create WebSocket with custom headers
  const ws = new WebSocket(url.toString(), [], {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  } as any);

  return new Promise((resolve, reject) => {
    let authResolved = false;

    ws.onopen = () => {
      // Connection opened, wait for auth response
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          ws.close();
          reject(new Error(`WebSocket auth failed: ${data.error}`));
        } else if (data.type === 'connected' || data.type === 'authenticated') {
          if (!authResolved) {
            authResolved = true;
            resolve(ws);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    ws.onerror = () => {
      if (!authResolved) {
        reject(new Error(`WebSocket connection failed: ${url}`));
      }
    };

    setTimeout(() => {
      if (!authResolved) {
        ws.close();
        reject(new Error("WebSocket connection timeout"));
      }
    }, 5000);
  });
}

/**
 * Wait for the next message on a WebSocket.
 */
export function waitForMessage(ws: WebSocket, timeout = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    ws.onmessage = (event) => resolve(String(event.data));
    setTimeout(() => reject(new Error("WebSocket message timeout")), timeout);
  });
}
