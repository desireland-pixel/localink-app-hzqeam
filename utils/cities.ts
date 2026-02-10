
// Top 200 cities for Germany and India
export const CITIES = [
  // Germany - Major cities
  'Berlin',
  'Munich',
  'Hamburg',
  'Frankfurt',
  'Cologne',
  'Stuttgart',
  'Düsseldorf',
  'Dortmund',
  'Essen',
  'Leipzig',
  'Bremen',
  'Dresden',
  'Hannover',
  'Nuremberg',
  'Duisburg',
  'Bochum',
  'Wuppertal',
  'Bielefeld',
  'Bonn',
  'Münster',
  'Karlsruhe',
  'Mannheim',
  'Augsburg',
  'Wiesbaden',
  'Gelsenkirchen',
  'Mönchengladbach',
  'Braunschweig',
  'Chemnitz',
  'Kiel',
  'Aachen',
  'Halle',
  'Magdeburg',
  'Freiburg',
  'Krefeld',
  'Lübeck',
  'Oberhausen',
  'Erfurt',
  'Mainz',
  'Rostock',
  'Kassel',
  'Hagen',
  'Hamm',
  'Saarbrücken',
  'Mülheim',
  'Potsdam',
  'Ludwigshafen',
  'Oldenburg',
  'Leverkusen',
  'Osnabrück',
  'Solingen',
  'Heidelberg',
  'Herne',
  'Neuss',
  'Darmstadt',
  'Paderborn',
  'Regensburg',
  'Ingolstadt',
  'Würzburg',
  'Fürth',
  'Wolfsburg',
  'Offenbach',
  'Ulm',
  'Heilbronn',
  'Pforzheim',
  'Göttingen',
  'Bottrop',
  'Trier',
  'Recklinghausen',
  'Reutlingen',
  'Bremerhaven',
  'Koblenz',
  'Bergisch Gladbach',
  'Jena',
  'Remscheid',
  'Erlangen',
  'Moers',
  'Siegen',
  'Hildesheim',
  'Salzgitter',
  
  // India - Major cities
  'Delhi',
  'Mumbai',
  'Bengaluru',
  'Bangalore',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Ahmedabad',
  'Pune',
  'Surat',
  'Jaipur',
  'Lucknow',
  'Kanpur',
  'Nagpur',
  'Indore',
  'Thane',
  'Bhopal',
  'Visakhapatnam',
  'Pimpri-Chinchwad',
  'Patna',
  'Vadodara',
  'Ghaziabad',
  'Ludhiana',
  'Agra',
  'Nashik',
  'Faridabad',
  'Meerut',
  'Rajkot',
  'Kalyan-Dombivali',
  'Vasai-Virar',
  'Varanasi',
  'Srinagar',
  'Aurangabad',
  'Dhanbad',
  'Amritsar',
  'Navi Mumbai',
  'Allahabad',
  'Prayagraj',
  'Ranchi',
  'Howrah',
  'Coimbatore',
  'Jabalpur',
  'Gwalior',
  'Vijayawada',
  'Jodhpur',
  'Madurai',
  'Raipur',
  'Kota',
  'Chandigarh',
  'Guwahati',
  'Solapur',
  'Hubli-Dharwad',
  'Mysore',
  'Mysuru',
  'Tiruchirappalli',
  'Bareilly',
  'Aligarh',
  'Tiruppur',
  'Moradabad',
  'Jalandhar',
  'Bhubaneswar',
  'Salem',
  'Warangal',
  'Mira-Bhayandar',
  'Thiruvananthapuram',
  'Guntur',
  'Bhiwandi',
  'Saharanpur',
  'Gorakhpur',
  'Bikaner',
  'Amravati',
  'Noida',
  'Jamshedpur',
  'Bhilai',
  'Cuttack',
  'Firozabad',
  'Kochi',
  'Cochin',
  'Nellore',
  'Bhavnagar',
  'Dehradun',
  'Durgapur',
  'Asansol',
  'Rourkela',
  'Nanded',
  'Kolhapur',
  'Ajmer',
  'Akola',
  'Gulbarga',
  'Jamnagar',
  'Ujjain',
  'Loni',
  'Siliguri',
  'Jhansi',
  'Ulhasnagar',
  'Jammu',
  'Sangli-Miraj',
  'Mangalore',
  'Erode',
  'Belgaum',
  'Ambattur',
  'Tirunelveli',
  'Malegaon',
  'Gaya',
  'Jalgaon',
  'Udaipur',
  'Maheshtala',
  'Goa',
];

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching with typo tolerance
 */
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
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Search cities with case-insensitive autocomplete, prefix matching, and typo tolerance
 * Prioritizes exact prefix matches, then close fuzzy matches
 * 
 * @param query - Search query from user input
 * @param maxResults - Maximum number of results to return (default: 10)
 * @returns Array of matching city names
 */
export function searchCities(query: string, maxResults: number = 10): string[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const lowerQuery = query.toLowerCase().trim();
  const exactPrefixMatches: string[] = [];
  const fuzzyMatches: Array<{ city: string; distance: number }> = [];

  for (const city of CITIES) {
    const lowerCity = city.toLowerCase();

    // Exact prefix match (highest priority)
    if (lowerCity.startsWith(lowerQuery)) {
      exactPrefixMatches.push(city);
      continue;
    }

    // Fuzzy match with typo tolerance (Levenshtein distance)
    // Allow up to 2 character differences for queries longer than 3 chars
    if (lowerQuery.length >= 3) {
      const distance = levenshteinDistance(lowerQuery, lowerCity.substring(0, lowerQuery.length));
      if (distance <= 2) {
        fuzzyMatches.push({ city, distance });
      }
    }

    // Contains match (for partial matches)
    if (lowerCity.includes(lowerQuery) && !exactPrefixMatches.includes(city)) {
      fuzzyMatches.push({ city, distance: 3 }); // Lower priority than typo matches
    }
  }

  // Sort fuzzy matches by distance (closer = better)
  fuzzyMatches.sort((a, b) => a.distance - b.distance);

  // Combine results: exact prefix matches first, then fuzzy matches
  const results = [
    ...exactPrefixMatches,
    ...fuzzyMatches.map(m => m.city)
  ];

  // Remove duplicates and limit results
  const uniqueResults = Array.from(new Set(results));
  return uniqueResults.slice(0, maxResults);
}

/**
 * Format date to dd.mm.yyyy
 * @param date - Date object or ISO string
 * @returns Formatted date string in dd.mm.yyyy format
 */
export function formatDateToDDMMYYYY(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Convert dd.mm.yyyy string to Date object
 * @param dateString - Date string in dd.mm.yyyy format
 * @returns Date object
 */
export function parseDDMMYYYY(dateString: string): Date | null {
  if (!dateString) return null;
  const parts = dateString.split('.');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

/**
 * Convert Date to ISO 8601 date string (YYYY-MM-DD) for API
 * @param date - Date object
 * @returns ISO date string (YYYY-MM-DD)
 */
export function dateToISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
