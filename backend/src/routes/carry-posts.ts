import type { App } from '../index.js';

// Carry posts feature has been removed
// This file is kept for compatibility but is no longer functional
export function registerCarryPostRoutes(app: App) {
  app.logger.info('Carry posts feature is deprecated and disabled');
}
