import PostHog from 'posthog-react-native';

let _client: PostHog | null = null;

export function getPostHog(): PostHog {
  if (!_client) {
    _client = new PostHog('phc_tkBmBRwfqAtK3pVkx3TBVh5NSnPpimiAnDinSS98tA7u', {
      host: 'https://eu.posthog.com',
    });
  }
  return _client;
}

export function capture(event: string, properties?: Record<string, any>) {
  try {
    getPostHog().capture(event, properties);
  } catch (e) {
    // fire-and-forget
  }
}

export function identify(userId: string, traits?: Record<string, any>) {
  try {
    getPostHog().identify(userId, traits);
  } catch (e) {
    // fire-and-forget
  }
}

export const SCREEN_NAMES = {
  HOME: 'home',
  SUBLET: 'sublet',
  SUBLET_DETAIL: 'sublet_detail',
  SUBLET_FILTERS: 'sublet_filters',
  SUBLET_POST: 'sublet_post',
  TRAVEL: 'travel',
  TRAVEL_DETAIL: 'travel_detail',
  TRAVEL_FILTERS: 'travel_filters',
  TRAVEL_POST: 'travel_post',
  COMMUNITY: 'community',
  COMMUNITY_DETAIL: 'community_detail',
  COMMUNITY_FILTERS: 'community_filters',
  COMMUNITY_POST: 'community_post',
  INBOX: 'inbox',
  CHAT: 'chat',
  FAVOURITES: 'favourites',
  MY_POSTS: 'my_posts',
  PERSONAL_DETAILS: 'personal_details',
  FAQS: 'faqs',
} as const;

// Session management
let _sessionId: string | null = null;
let _sessionStartTime: number | null = null;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function startSession() {
  _sessionId = generateSessionId();
  _sessionStartTime = Date.now();
  capture('session_start', { session_id: _sessionId });
}

export function endSession() {
  if (_sessionId && _sessionStartTime) {
    const duration_seconds = Math.round((Date.now() - _sessionStartTime) / 1000);
    capture('session_end', { session_id: _sessionId, duration_seconds });
    _sessionId = null;
    _sessionStartTime = null;
  }
}

export function getSessionId(): string | null {
  return _sessionId;
}

export function checkSessionTimeout(backgroundedAt: number) {
  const elapsed = Date.now() - backgroundedAt;
  if (elapsed > SESSION_TIMEOUT_MS) {
    endSession();
    startSession();
  } else {
    if (!_sessionId) {
      startSession();
    }
    // else: resume same session, do nothing
  }
}

export function captureWithSession(event: string, properties?: Record<string, any>) {
  capture(event, { ...properties, session_id: getSessionId() });
}
