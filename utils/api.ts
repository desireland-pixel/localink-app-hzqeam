import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { BEARER_TOKEN_KEY } from "@/lib/auth";
import { getIsOnline } from "@/utils/networkState";

/**
 * Structured API error that carries a machine-readable `code` so callers can
 * distinguish offline errors from server errors without string-matching.
 */
export class ApiError extends Error {
  code: string;
  status?: number;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// In-memory token cache
// ---------------------------------------------------------------------------
// We keep the bearer token in module memory for a short window so that bursts
// of API calls (e.g. parallel list + favorites fetch on a screen) don't each
// hit SecureStore / localStorage. The cache is invalidated whenever the token
// is written or cleared via lib/auth.ts, and whenever the server returns 401.
const TOKEN_CACHE_TTL_MS = 60_000; // 1 minute
let _cachedToken: string | null = null;
let _cachedTokenAt = 0;

export const invalidateTokenCache = (): void => {
  _cachedToken = null;
  _cachedTokenAt = 0;
};

/**
 * Backend URL is configured in app.json under expo.extra.backendUrl
 * It is set automatically when the backend is deployed
 */
export const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || "";

/**
 * Check if backend is properly configured
 */
export const isBackendConfigured = (): boolean => {
  return !!BACKEND_URL && BACKEND_URL.length > 0;
};

/**
 * Get bearer token from platform-specific storage
 * Web: localStorage
 * Native: SecureStore
 *
 * @returns Bearer token or null if not found
 */
export const getBearerToken = async (): Promise<string | null> => {
  // Serve from memory cache when fresh.
  if (_cachedToken && Date.now() - _cachedTokenAt < TOKEN_CACHE_TTL_MS) {
    return _cachedToken;
  }
  try {
    let token: string | null;
    if (Platform.OS === "web") {
      token = localStorage.getItem(BEARER_TOKEN_KEY);
    } else {
      token = await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
    }
    _cachedToken = token;
    _cachedTokenAt = Date.now();
    return token;
  } catch (error) {
    console.error("[API] Error retrieving bearer token:", error);
    return null;
  }
};

/**
 * Generic API call helper with error handling
 *
 * @param endpoint - API endpoint path (e.g., '/users', '/auth/login')
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Parsed JSON response
 * @throws Error if backend is not configured or request fails
 */
export const apiCall = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  if (!getIsOnline()) {
    console.log(`[API] Blocked offline request: ${options?.method ?? 'GET'} ${endpoint}`);
    throw new ApiError(
      'No internet connection. Please check your connection and try again.',
      'network'
    );
  }

  if (!isBackendConfigured()) {
    throw new Error("Backend URL not configured. Please rebuild the app.");
  }

  const url = `${BACKEND_URL}${endpoint}`;
  
  const method = options?.method || "GET";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const fetchOptions: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      signal: controller.signal,
    };

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const text = await response.text();
      console.error(`API ← ${response.status} ERROR`, text);
      // If the server rejected our credentials, drop the cached token so the
      // next call re-reads from storage (where the real token may have rotated).
      if (response.status === 401) {
        invalidateTokenCache();
      }
      throw new Error(`API error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    
    return data;
    
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    // Suppress expected offline errors — the OfflineModal already informs the user.
    if (!(error instanceof ApiError && error.code === 'network')) {
      console.error("[API] Request failed:", error);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * GET request helper
 */
export const apiGet = async <T = any>(endpoint: string): Promise<T> => {
  return apiCall<T>(endpoint, { method: "GET" });
};

/**
 * POST request helper
 */
export const apiPost = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * PUT request helper
 */
export const apiPut = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

/**
 * PATCH request helper
 */
export const apiPatch = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

/**
 * DELETE request helper
 * Always sends a body to avoid FST_ERR_CTP_EMPTY_JSON_BODY errors
 */
export const apiDelete = async <T = any>(endpoint: string, data: any = {}): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated API call helper
 * Automatically retrieves bearer token from storage and adds to Authorization header
 *
 * @param endpoint - API endpoint path
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Parsed JSON response
 * @throws Error if token not found or request fails
 */
export const authenticatedApiCall = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const token = await getBearerToken();

  if (!token) {
    throw new Error("Authentication token not found. Please sign in.");
  }

  return apiCall<T>(endpoint, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Authenticated GET request
 */
export const authenticatedGet = async <T = any>(endpoint: string): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, { method: "GET" });
};

/**
 * Authenticated POST request
 */
export const authenticatedPost = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated PUT request
 */
export const authenticatedPut = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated PATCH request
 */
export const authenticatedPatch = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated DELETE request
 * Always sends a body to avoid FST_ERR_CTP_EMPTY_JSON_BODY errors
 */
export const authenticatedDelete = async <T = any>(endpoint: string, data: any = {}): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
};
