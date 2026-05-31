import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { GERMAN_CITIES, TRAVEL_CITIES } from '../cities.js';

interface CitySearchQuery {
  q?: string;
  limit?: string;
  type?: 'all' | 'travel';
}

export function registerCityRoutes(app: App) {
  // Search cities with autocomplete
  app.fastify.get('/api/cities/search', {
    schema: {
      description: 'Search cities with autocomplete, prefix matching, and typo tolerance',
      tags: ['cities'],
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query' },
          limit: { type: 'string', description: 'Maximum results (default: 10)' },
          type: { type: 'string', enum: ['all', 'travel'], description: 'City type filter' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            cities: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { q, limit, type } = request.query as CitySearchQuery;

    app.logger.info({ query: q, limit, type }, 'Searching cities');

    const query = (q || '').toLowerCase().trim();
    const limitVal = parseInt(limit || '8') || 8;
    const cityList = type === 'travel' ? TRAVEL_CITIES : GERMAN_CITIES;

    let results: string[] = [];

    if (query) {
      const bucket1: string[] = [];
      const bucket2: string[] = [];

      for (const city of cityList) {
        const cityLower = city.toLowerCase();
        if (cityLower.startsWith(query)) {
          bucket1.push(city);
        } else if (cityLower.includes(query)) {
          bucket2.push(city);
        }
      }

      results = bucket1.concat(bucket2).slice(0, limitVal);
    }

    app.logger.info({ query, resultsCount: results.length }, 'City search completed');

    return { cities: results };
  });

  // Get all cities (for forms/dropdowns)
  app.fastify.get('/api/cities', {
    schema: {
      description: 'Get all available cities',
      tags: ['cities'],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['all', 'travel'], description: 'City type filter' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            cities: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { type } = request.query as { type?: 'all' | 'travel' };

    app.logger.info({ type }, 'Fetching all cities');

    if (type === 'travel') {
      return { cities: TRAVEL_CITIES };
    }

    return { cities: GERMAN_CITIES };
  });
}
