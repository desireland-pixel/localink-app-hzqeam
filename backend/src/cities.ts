// Top 200 cities in Germany for LokaLinc
export const GERMAN_CITIES = [
  'Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund',
  'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hannover', 'Nuremberg', 'Duisburg', 'Bochum',
  'Wuppertal', 'Bielefeld', 'Bonn', 'Münster', 'Karlsruhe', 'Mannheim', 'Augsburg', 'Wiesbaden',
  'Gelsenkirchen', 'Mönchengladbach', 'Braunschweig', 'Chemnitz', 'Kiel', 'Aachen', 'Halle',
  'Magdeburg', 'Freiburg', 'Krefeld', 'Lübeck', 'Oberhausen', 'Erfurt', 'Mainz', 'Rostock',
  'Kassel', 'Hagen', 'Hamm', 'Saarbrücken', 'Mülheim', 'Potsdam', 'Ludwigshafen', 'Oldenburg',
  'Leverkusen', 'Osnabrück', 'Solingen', 'Heidelberg', 'Herne', 'Neuss', 'Darmstadt', 'Paderborn',
  'Regensburg', 'Ingolstadt', 'Würzburg', 'Fürth', 'Wolfsburg', 'Offenbach', 'Ulm', 'Heilbronn',
  'Pforzheim', 'Göttingen', 'Bottrop', 'Trier', 'Recklinghausen', 'Reutlingen', 'Bremerhaven',
  'Koblenz', 'Bergisch Gladbach', 'Jena', 'Remscheid', 'Erlangen', 'Moers', 'Siegen', 'Hildesheim',
  'Salzgitter', 'Cottbus', 'Kaiserslautern', 'Witten', 'Schwerin', 'Esslingen', 'Gütersloh',
  'Düren', 'Ratingen', 'Lünen', 'Hanau', 'Flensburg', 'Wilhelmshaven', 'Ludwigsburg', 'Marl',
  'Velbert', 'Norderstedt', 'Viersen', 'Worms', 'Neustadt', 'Marburg', 'Celle', 'Fulda',
  'Aschaffenburg', 'Lüdenscheid', 'Kerpen', 'Neubrandenburg', 'Sindelfingen', 'Delmenhorst',
  'Dormagen', 'Bamberg', 'Gießen', 'Plauen', 'Menden', 'Castrop-Rauxel', 'Bayreuth', 'Herford',
  'Minden', 'Gladbeck', 'Rheine', 'Wesel', 'Detmold', 'Lüneburg', 'Neumünster', 'Brandenburg',
  'Bocholt', 'Unna', 'Grevenbroich', 'Troisdorf', 'Villingen-Schwenningen', 'Kempten', 'Lörrach',
  'Arnsberg', 'Herten', 'Bergheim', 'Weimar', 'Gera', 'Stralsund', 'Langenfeld', 'Stolberg',
  'Hameln', 'Görlitz', 'Waiblingen', 'Schwäbisch Gmünd', 'Friedrichshafen', 'Lingen', 'Garbsen',
  'Greifswald', 'Sankt Augustin', 'Meerbusch', 'Hürth', 'Pulheim', 'Euskirchen', 'Offenburg',
  'Hattingen', 'Neustadt an der Weinstraße', 'Eschweiler', 'Passau', 'Speyer', 'Frechen',
  'Gronau', 'Langenhagen', 'Sindelfingen', 'Bad Homburg', 'Konstanz', 'Memmingen', 'Ravensburg',
  'Rosenheim', 'Neu-Ulm', 'Stade', 'Kleve', 'Schweinfurt', 'Landshut', 'Aalen', 'Ludwigsfelde',
  'Lippstadt', 'Neuwied', 'Willich', 'Baden-Baden', 'Bünde', 'Bad Salzuflen', 'Heidenheim',
  'Pirmasens', 'Bad Kreuznach', 'Wolfenbüttel', 'Kaufbeuren', 'Emden', 'Gotha'
];

// Predefined cities for travel posts (combining major German and Indian cities)
export const TRAVEL_CITIES = [
  // Germany
  'Frankfurt', 'Munich', 'Berlin', 'Düsseldorf', 'Hamburg', 'Stuttgart', 'Cologne', 'Hannover',
  // India
  'Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kochi', 'Kolkata', 'Ahmedabad',
  'Goa', 'Thiruvananthapuram',
  // Country names
  'India', 'Germany'
];

// Country to cities mapping for travel post filtering
export const COUNTRY_CITIES: Record<string, string[]> = {
  'India': ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kochi', 'Kolkata', 'Ahmedabad', 'Goa', 'Thiruvananthapuram'],
  'Germany': ['Frankfurt', 'Munich', 'Berlin', 'Düsseldorf', 'Hamburg', 'Stuttgart', 'Cologne', 'Hannover'],
};

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len1][len2];
}

interface CityMatch {
  city: string;
  score: number;
}

export function searchCities(query: string, limit: number = 10): string[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const matches: CityMatch[] = [];

  for (const city of GERMAN_CITIES) {
    const normalizedCity = city.toLowerCase();

    // Exact match (highest priority)
    if (normalizedCity === normalizedQuery) {
      matches.push({ city, score: 1000 });
      continue;
    }

    // Prefix match (high priority)
    if (normalizedCity.startsWith(normalizedQuery)) {
      matches.push({ city, score: 500 + (100 - normalizedQuery.length) });
      continue;
    }

    // Contains match (medium priority)
    if (normalizedCity.includes(normalizedQuery)) {
      const position = normalizedCity.indexOf(normalizedQuery);
      matches.push({ city, score: 300 - position });
      continue;
    }

    // Fuzzy match with typo tolerance (lower priority)
    const distance = levenshteinDistance(normalizedQuery, normalizedCity);
    const maxDistance = Math.min(2, Math.floor(normalizedQuery.length / 3));

    if (distance <= maxDistance) {
      matches.push({ city, score: 100 - distance * 10 });
    }
  }

  // Sort by score (descending) and then alphabetically
  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.city.localeCompare(b.city);
  });

  return matches.slice(0, limit).map(m => m.city);
}

export function validateCity(city: string): boolean {
  const normalizedCity = city.trim();
  return GERMAN_CITIES.some(c => c.toLowerCase() === normalizedCity.toLowerCase());
}

export function validateTravelCity(city: string): boolean {
  const normalizedCity = city.trim();
  return TRAVEL_CITIES.some(c => c.toLowerCase() === normalizedCity.toLowerCase());
}
