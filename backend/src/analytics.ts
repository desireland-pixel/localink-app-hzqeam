import { PostHog } from 'posthog-node';

const posthog = new PostHog('phc_tkBmBRwfqAtK3pVkx3TBVh5NSnPpimiAnDinSS98tA7u', {
  host: 'https://eu.posthog.com',
  flushAt: 20,
  flushInterval: 10000,
});

export function capture(
  distinctId: string,
  event: string,
  properties?: Record<string, any>
): void {
  try {
    posthog.capture({
      distinctId,
      event,
      properties: properties || {},
    });
  } catch (error) {
    // Silently ignore any errors - never let analytics block the response
  }
}
