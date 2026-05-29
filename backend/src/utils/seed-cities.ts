import type { App } from '../index.js';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as fs from 'fs';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createUnzip } from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface GeonamesAlternateEntry {
  geonameid: string;
  alternateName: string;
}

interface CityData {
  geonameid: string;
  name: string;
  asciiname: string;
  country_code: string;
  population: number;
  alternates: string[];
}

async function downloadFile(url: string, dest: string, timeout: number = 120000): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buffer));
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseAlternateNames(filePath: string): Promise<Map<string, GeonamesAlternateEntry[]>> {
  const alternates = new Map<string, GeonamesAlternateEntry[]>();

  if (!fs.existsSync(filePath)) {
    return alternates;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    const parts = line.split('\t');
    if (parts.length < 8) continue;

    const [, geonameid, isolanguage, alternateName, isPreferredName, , , isHistoric] = parts;

    // Only take English, non-historic alternate names
    if (isolanguage === 'en' && isHistoric !== '1') {
      if (!alternates.has(geonameid)) {
        alternates.set(geonameid, []);
      }
      alternates.get(geonameid)!.push({
        geonameid,
        alternateName,
      });
    }
  }

  return alternates;
}

async function parseCities5000(
  filePath: string,
  alternates: Map<string, GeonamesAlternateEntry[]>
): Promise<CityData[]> {
  const cities: CityData[] = [];

  if (!fs.existsSync(filePath)) {
    return cities;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    const parts = line.split('\t');
    if (parts.length < 15) continue;

    const geonameid = parts[0];
    const name = parts[1];
    const asciiname = parts[2];
    const feature_class = parts[6];
    const feature_code = parts[7];
    const country_code = parts[8];
    const population = parseInt(parts[14], 10) || 0;

    // Filter: only Germany, only cities (feature_class == 'P')
    if (country_code !== 'DE' || feature_class !== 'P') {
      continue;
    }

    cities.push({
      geonameid,
      name,
      asciiname,
      country_code,
      population,
      alternates: alternates.get(geonameid)?.map(a => a.alternateName) || [],
    });
  }

  return cities;
}

function buildSearchTerms(
  displayName: string,
  asciiname: string,
  officialName: string,
  englishAlternates: string[]
): string {
  const termSet = new Set<string>();

  // Add all terms lowercased
  if (displayName) termSet.add(displayName.toLowerCase());
  if (asciiname) termSet.add(asciiname.toLowerCase());
  if (officialName) termSet.add(officialName.toLowerCase());

  for (const alt of englishAlternates) {
    if (alt) termSet.add(alt.toLowerCase());
  }

  // Sort alphabetically and join with spaces
  const sortedTerms = Array.from(termSet).sort();
  return sortedTerms.join(' ');
}

async function seedCities(app: App): Promise<void> {
  try {
    app.logger.info({}, 'Starting city seeding process');

    // Check if already seeded (>= 500 DE cities)
    const existingCities = await app.db
      .select()
      .from(schema.cities)
      .where(eq(schema.cities.country_code, 'DE'));

    if (existingCities.length >= 500) {
      app.logger.info({ count: existingCities.length }, 'Cities already seeded, skipping');
      return;
    }

    // Create temp directory
    const tmpDir = path.join(__dirname, '..', '..', '.tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const cities5000Zip = path.join(tmpDir, 'cities5000.zip');
    const deAlternatesZip = path.join(tmpDir, 'alternateNames_DE.zip');
    const cities5000Txt = path.join(tmpDir, 'cities5000.txt');
    const deAlternatesTxt = path.join(tmpDir, 'alternateNames_DE.txt');

    // Download files
    app.logger.info({}, 'Downloading GeoNames cities5000 file');
    await downloadFile('https://download.geonames.org/export/dump/cities5000.zip', cities5000Zip, 120000);

    app.logger.info({}, 'Downloading GeoNames DE alternate names file');
    await downloadFile(
      'https://download.geonames.org/export/dump/alternateNames/DE.zip',
      deAlternatesZip,
      120000
    );

    // Extract files
    app.logger.info({}, 'Extracting GeoNames files');
    await pipeline(fs.createReadStream(cities5000Zip), createUnzip(), createWriteStream(cities5000Txt));

    if (fs.existsSync(deAlternatesZip)) {
      await pipeline(
        fs.createReadStream(deAlternatesZip),
        createUnzip(),
        createWriteStream(deAlternatesTxt)
      );
    }

    // Parse alternate names
    app.logger.info({}, 'Parsing alternate names');
    const alternates = await parseAlternateNames(deAlternatesTxt);

    // Parse cities
    app.logger.info({}, 'Parsing cities5000');
    const cities = await parseCities5000(cities5000Txt, alternates);

    // Build city records for upsert
    const records = cities.map(city => {
      // Determine display name: prefer English preferred alternate, then any English alternate, then asciiname, then official name
      let displayName = city.name;
      const preferred = city.alternates.find(alt => alt === city.name);
      if (preferred) {
        displayName = preferred;
      } else if (city.alternates.length > 0) {
        displayName = city.alternates[0];
      } else if (city.asciiname) {
        displayName = city.asciiname;
      }

      const searchTerms = buildSearchTerms(displayName, city.asciiname, city.name, city.alternates);

      return {
        name: displayName,
        name_lower: displayName.toLowerCase(),
        country_code: city.country_code,
        population: city.population,
        search_terms: searchTerms,
      };
    });

    // Upsert in batches of 200
    app.logger.info({ totalCities: records.length }, 'Upserting cities');
    const batchSize = 200;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      await app.db
        .insert(schema.cities)
        .values(batch)
        .onConflictDoUpdate({
          target: [schema.cities.name, schema.cities.country_code],
          set: {
            population: sql`GREATEST(${schema.cities.population}, excluded.population)`,
            search_terms: sql`excluded.search_terms`,
            name_lower: sql`excluded.name_lower`,
          },
        });
    }

    // Get final count
    const finalCities = await app.db
      .select()
      .from(schema.cities)
      .where(eq(schema.cities.country_code, 'DE'));

    app.logger.info({ count: finalCities.length }, 'City seeding completed successfully');

    // Cleanup temp files
    try {
      fs.unlinkSync(cities5000Zip);
      fs.unlinkSync(deAlternatesZip);
      fs.unlinkSync(cities5000Txt);
      if (fs.existsSync(deAlternatesTxt)) {
        fs.unlinkSync(deAlternatesTxt);
      }
    } catch (e) {
      app.logger.warn({ err: e }, 'Failed to cleanup temp files');
    }
  } catch (error) {
    app.logger.error({ err: error }, 'City seeding failed, continuing without city data');
  }
}

export async function startCitySeeding(app: App): Promise<void> {
  // Run seeding in background without blocking HTTP server startup
  setImmediate(() => {
    seedCities(app).catch(err => {
      app.logger.error({ err }, 'Unhandled error in city seeding');
    });
  });
}
