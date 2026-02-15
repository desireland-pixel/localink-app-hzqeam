
export const GERMAN_CITIES = [
  'Berlin',
  'Hamburg',
  'Munich',
  'Cologne',
  'Frankfurt',
  'Stuttgart',
  'Düsseldorf',
  'Dortmund',
  'Essen',
  'Leipzig',
  'Bremen',
  'Dresden',
  'Hanover',
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
];

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
