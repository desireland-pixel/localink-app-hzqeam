// Generate a consistent 8-digit numeric ID from a UUID
export function generateShortId(uuid: string): string {
  // Remove hyphens from UUID
  const cleanUuid = uuid.replace(/-/g, '');

  // Take first 16 hex characters and convert to a large number
  const hexPart = cleanUuid.substring(0, 16);

  // Convert hex to decimal
  const decimalValue = BigInt('0x' + hexPart);

  // Take modulo to get 8 digits (0-99999999)
  const eightDigit = (decimalValue % BigInt(100000000)).toString();

  // Pad with leading zeros to ensure 8 digits
  return eightDigit.padStart(8, '0');
}
