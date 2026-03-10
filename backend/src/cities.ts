// Top 200 cities in Germany for LokaLinc
export const GERMAN_CITIES = [
  'Aachen', 'Aalen', 'Arnsberg', 'Aschaffenburg', 'Augsburg', 'Bad Homburg', 'Bad Kreuznach', 'Bad Salzuflen', 'Baden-Baden', 'Bamberg',
  'Bayreuth', 'Bergheim', 'Bergisch Gladbach', 'Berlin', 'Bielefeld', 'Bocholt', 'Bochum', 'Bonn', 'Bottrop', 'Brandenburg an der Havel',
  'Braunschweig', 'Bremen', 'Bremerhaven', 'Bünde', 'Castrop-Rauxel', 'Celle', 'Chemnitz', 'Cologne', 'Cottbus', 'Darmstadt',
  'Deggendorf', 'Delmenhorst', 'Dessau-Roßlau', 'Detmold', 'Dormagen', 'Dortmund', 'Dresden', 'Duisburg', 'Düren', 'Düsseldorf',
  'Emden', 'Erfurt', 'Erlangen', 'Eschweiler', 'Esslingen am Neckar', 'Essen', 'Euskirchen', 'Flensburg', 'Frankfurt am Main',
  'Frankfurt (Oder)', 'Frechen', 'Freiburg im Breisgau', 'Friedrichshafen', 'Fulda', 'Fürth', 'Garbsen', 'Gelsenkirchen', 'Gera', 'Gießen',
  'Gladbeck', 'Görlitz', 'Gotha', 'Göttingen', 'Greifswald', 'Grevenbroich', 'Gronau', 'Gummersbach', 'Gütersloh', 'Hagen',
  'Halle (Saale)', 'Hameln', 'Hamm', 'Hanau', 'Hannover', 'Hattingen', 'Heidelberg', 'Heidenheim', 'Heilbronn', 'Herford',
  'Herne', 'Herten', 'Hildesheim', 'Hof', 'Holzkirchen', 'Hürth', 'Ingolstadt', 'Iserlohn', 'Jena', 'Kaiserslautern',
  'Karlsruhe', 'Kassel', 'Kaufbeuren', 'Kempten (Allgäu)', 'Kerpen', 'Kiel', 'Kleve', 'Koblenz', 'Konstanz', 'Krefeld',
  'Landshut', 'Langenfeld', 'Langenhagen', 'Leipzig', 'Leverkusen', 'Lingen', 'Lippstadt', 'Lörrach', 'Lübeck', 'Ludwigsburg',
  'Ludwigsfelde', 'Ludwigshafen am Rhein', 'Lüdenscheid', 'Lünen', 'Lüneburg', 'Magdeburg', 'Mainz', 'Mannheim', 'Marl', 'Marburg',
  'Meerbusch', 'Memmingen', 'Menden', 'Minden', 'Moers', 'Mönchengladbach', 'Mülheim an der Ruhr', 'Munich', 'Münster', 'Neubrandenburg',
  'Neu-Ulm', 'Neumünster', 'Neuss', 'Neustadt an der Weinstraße', 'Neuwied', 'Norderstedt', 'Nordhausen', 'Nuremberg', 'Oberhausen', 'Offenbach am Main',
  'Offenburg', 'Oldenburg', 'Osnabrück', 'Paderborn', 'Passau', 'Pforzheim', 'Pirmasens', 'Plauen', 'Potsdam', 'Pulheim',
  'Ratingen', 'Ravensburg', 'Recklinghausen', 'Regensburg', 'Remscheid', 'Reutlingen', 'Rheine', 'Rosenheim', 'Rostock', 'Rüsselsheim am Main',
  'Saarbrücken', 'Salzgitter', 'Sankt Augustin', 'Schwäbisch Gmünd', 'Schweinfurt', 'Schwerin', 'Siegen', 'Sindelfingen', 'Solingen', 'Speyer',
  'Stade', 'Stolberg', 'Stralsund', 'Stuttgart', 'Trier', 'Troisdorf', 'Tübingen', 'Ulm', 'Unna', 'Velbert',
  'Viersen', 'Villingen-Schwenningen', 'Waiblingen', 'Weimar', 'Wesel', 'Wetzlar', 'Wiesbaden', 'Wilhelmshaven', 'Willich', 'Witten',
  'Wolfenbüttel', 'Wolfsburg', 'Worms', 'Wuppertal', 'Würzburg', 'Zwickau'
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
