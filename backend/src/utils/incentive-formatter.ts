/**
 * Formats incentive amount to xx.xx format
 * Handles numeric, string, and null inputs
 * Examples: 2 → "2.00", 10 → "10.00", 3.5 → "3.50", null → null
 */
export function formatIncentiveAmount(amount: string | number | null | undefined): string | null {
  if (amount === null || amount === undefined) {
    return null;
  }

  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numAmount) || numAmount === 0) {
      return null;
    }

    // Format to 2 decimal places
    return numAmount.toFixed(2);
  } catch (error) {
    return null;
  }
}

/**
 * Returns the incentive disclaimer text
 */
export function getIncentiveDisclaimer(): string {
  return 'Incentives are voluntary. The platform only facilitates connections and does not handle payments. Users are solely responsible for legal, airline, and customs compliance.';
}
