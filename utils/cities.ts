
export const GERMAN_CITIES = [
  'Aachen',
  'Aalen',
  'Aschaffenburg',
  'Augsburg',
  'Baden-Baden',
  'Bamberg',
  'Bayreuth',
  'Berlin',
  'Bielefeld',
  'Bochum',
  'Bonn',
  'Bottrop',
  'Brandenburg an der Havel',
  'Braunschweig',
  'Bremen',
  'Bremerhaven',
  'Chemnitz',
  'Cologne',
  'Cottbus',
  'Darmstadt',
  'Deggendorf',
  'Delmenhorst',
  'Dessau-Roßlau',
  'Detmold',
  'Dortmund',
  'Dresden',
  'Duisburg',
  'Düsseldorf',
  'Em',
  'Erfurt',
  'Erlangen',
  'Essen',
  'Esslingen am Neckar',
  'Flensburg',
  'Frankfurt am Main',
  'Frankfurt (Oder)',
  'Freiburg im Breisgau',
  'Friedrichshafen',
  'Fulda',
  'Fürth',
  'Gelsenkirchen',
  'Gießen',
  'Göttingen',
  'Greifswald',
  'Gummersbach',
  'Hagen',
  'Halle (Saale)',
  'Hamburg',
  'Hamm',
  'Hannover',
  'Heidelberg',
  'Heilbronn',
  'Herford',
  'Hildesheim',
  'Hof',
  'Ingolstadt',
  'Iserlohn',
  'Jena',
  'Kaiserslautern',
  'Karlsruhe',
  'Kassel',
  'Kempten (Allgäu)',
  'Kiel',
  'Koblenz',
  'Konstanz',
  'Krefeld',
  'Landshut',
  'Leipzig',
  'Leverkusen',
  'Lübeck',
  'Ludwigsburg',
  'Ludwigshafen am Rhein',
  'Lüneburg',
  'Magdeburg',
  'Mainz',
  'Mannheim',
  'Marburg',
  'Mönchengladbach',
  'Mülheim an der Ruhr',
  'Munich',
  'Münster',
  'Neubrandenburg',
  'Neuss',
  'Nordhausen',
  'Nuremberg',
  'Offenbach am Main',
  'Offenburg',
  'Oldenburg',
  'Osnabrück',
  'Paderborn',
  'Passau',
  'Pforzheim',
  'Potsdam',
  'Recklinghausen',
  'Regensburg',
  'Reutlingen',
  'Rosenheim',
  'Rostock',
  'Rüsselsheim am Main',
  'Saarbrücken',
  'Salzgitter',
  'Sankt Augustin',
  'Schwäbisch Gmünd',
  'Schweinfurt',
  'Schwerin',
  'Siegen',
  'Solingen',
  'Stralsund',
  'Stuttgart',
  'Trier',
  'Tübingen',
  'Ulm',
  'Villingen-Schwenningen',
  'Weimar',
  'Wetzlar',
  'Wiesbaden',
  'Wilhelmshaven',
  'Witten',
  'Wolfenbüttel',
  'Wolfsburg',
  'Worms',
  'Wuppertal',
  'Würzburg',
  'Zwickau'
];

// City/Country code mapping for travel page
export const CITY_CODES: { [key: string]: string } = {
  // Countries
  'India': 'IND',
  'Germany': 'DE',
  
  // Indian cities
  'Ahmedabad': 'AMD',
  'Bengaluru': 'BLR',
  'Bangalore': 'BLR',
  'Chennai': 'MAA',
  'Delhi': 'DEL',
  'Goa': 'GOI',
  'Hyderabad': 'HYD',
  'Kochi': 'COK',
  'Cochin': 'COK',
  'Kolkata': 'CCU',
  'Mumbai': 'BOM',
  'Thiruvananthapuram': 'TRV',
  'Trivandrum': 'TRV',
  
  // German cities
  'Berlin': 'BER',
  'Cologne': 'CGN',
  'Düsseldorf': 'DUS',
  'Dusseldorf': 'DUS',
  'Frankfurt': 'FRA',
  'Hamburg': 'HAM',
  'Hannover': 'HAJ',
  'Hanover': 'HAJ',
  'Munich': 'MUC',
  'Stuttgart': 'STR',
};

// Get city code for display (returns code if available, otherwise original name)
export function getCityCode(cityName: string): string {
  if (!cityName) return '';
  return CITY_CODES[cityName] || cityName;
}

// Get full city name from code (for reverse lookup)
export function getCityFromCode(code: string): string {
  if (!code) return '';
  const entry = Object.entries(CITY_CODES).find(([_, c]) => c === code);
  return entry ? entry[0] : code;
}

// Format Date object to dd.mm.yyyy string
export function formatDateToDDMMYYYY(date: Date | string): string {
  if (typeof date === 'string') {
    // If it's already a string, check if it's in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
      // Convert YYYY-MM-DD to dd.mm.yyyy
      const parts = date.split('T')[0].split('-');
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    // If it's already in dd.mm.yyyy format, return as is
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
      return date;
    }
    // Try to parse as Date
    date = new Date(date);
  }
  
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// Convert Date object to ISO string for backend (YYYY-MM-DD)
export function dateToISOString(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse dd.mm.yyyy string to YYYY-MM-DD string for backend
export function parseDateFromDDMMYYYY(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split('T')[0];
  }
  
  // Parse dd.mm.yyyy format
  const parts = dateStr.split('.');
  if (parts.length !== 3) return null;
  
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2];
  
  return `${year}-${month}-${day}`;
}
