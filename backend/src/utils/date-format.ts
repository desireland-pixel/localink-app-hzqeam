// Convert date from YYYY-MM-DD to dd.mm.yyyy format
export function formatDateToDDMMYYYY(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  try {
    // If it's already in dd.mm.yyyy format, return as is
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
      return dateStr;
    }

    // Parse YYYY-MM-DD format
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return null;

    return `${day}.${month}.${year}`;
  } catch (error) {
    return null;
  }
}

// Convert date from dd.mm.yyyy to YYYY-MM-DD format
export function parseDateFromDDMMYYYY(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  try {
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Parse dd.mm.yyyy format
    const [day, month, year] = dateStr.split('.');
    if (!day || !month || !year) return null;

    return `${year}-${month}-${day}`;
  } catch (error) {
    return null;
  }
}

// Ensure date is in database format (YYYY-MM-DD)
export function ensureDatabaseDateFormat(date: string | null | undefined): string | null {
  if (!date) return null;
  return parseDateFromDDMMYYYY(date) || date;
}
