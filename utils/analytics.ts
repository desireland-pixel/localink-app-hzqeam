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
