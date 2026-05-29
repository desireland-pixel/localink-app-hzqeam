import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { searchCities, GERMAN_CITIES, TRAVEL_CITIES } from '../cities.js';

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

    // If type is travel, return predefined travel cities
    if (type === 'travel') {
      if (!q || q.trim().length === 0) {
        return { cities: TRAVEL_CITIES };
      }

      const normalizedQuery = q.toLowerCase().trim();
      const filtered = TRAVEL_CITIES.filter(city =>
        city.toLowerCase().includes(normalizedQuery)
      ).sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(normalizedQuery);
        const bStarts = b.toLowerCase().startsWith(normalizedQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      });

      return { cities: filtered.slice(0, parseInt(limit || '20')) };
    }

    // Default: search German cities from database
    if (!q || q.trim().length === 0) {
      return { cities: [] };
    }

    const q_lower = q.toLowerCase().trim();
    const limit_val = Math.min(parseInt(limit || '8') || 8, 20);

    app.logger.info({ query: q, limit: limit_val }, 'Searching cities from database');

    try {
      const results = await app.db
        .select({ name: schema.cities.name })
        .from(schema.cities)
        .where(sql`${schema.cities.search_terms} LIKE ${'%' + q_lower + '%'}`)
        .orderBy(
          sql`CASE WHEN ${schema.cities.name_lower} LIKE ${q_lower + '%'} THEN 0 ELSE 1 END`,
          sql`${schema.cities.population} DESC`,
          sql`${schema.cities.name} ASC`
        )
        .limit(limit_val);

      const cityNames = results.map(r => r.name);

      app.logger.info({ query: q, resultsCount: cityNames.length }, 'City search completed');

      return { cities: cityNames };
    } catch (error) {
      app.logger.error({ err: error, query: q }, 'Error searching cities from database, falling back to fuzzy search');

      // Fallback to fuzzy search if database search fails
      const maxResults = limit_val;
      const results = searchCities(q, maxResults);
      return { cities: results };
    }
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
