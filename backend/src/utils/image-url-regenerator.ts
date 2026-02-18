import type { App } from '../index.js';

/**
 * Regenerates fresh signed URLs for images in posts
 * Extracts S3 keys from old URLs and creates new signed URLs
 */
export async function regenerateSignedUrls(
  app: App,
  imageUrls: string[] | null | undefined
): Promise<string[]> {
  if (!imageUrls || imageUrls.length === 0) {
    return [];
  }

  const freshUrls: string[] = [];

  for (const url of imageUrls) {
    try {
      // The URL already contains the full path including the storage key
      // We need to extract just the key portion for regenerating the signed URL
      // Storage keys are typically in format: images/userId/timestamp-filename.jpg
      // Extract the key from the path
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      // Reconstruct the storage key from the path
      // Skip domain-specific prefixes and reconstruct the key
      let s3Key = '';

      // Look for the storage key pattern (e.g., images/userId/timestamp-filename)
      const match = url.match(/\/(images\/[^?]+)/);
      if (match && match[1]) {
        s3Key = match[1];
      } else {
        // If we can't parse the S3 key, keep the original URL
        freshUrls.push(url);
        continue;
      }

      // Generate fresh signed URL
      const { url: freshUrl } = await app.storage.getSignedUrl(s3Key);
      freshUrls.push(freshUrl);
    } catch (error) {
      app.logger.warn({ url, err: error }, 'Failed to regenerate signed URL, keeping original');
      freshUrls.push(url);
    }
  }

  return freshUrls;
}
