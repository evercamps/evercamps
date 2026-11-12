// Belgian company number (KBO / BCE, "ondernemingsnummer"): 10 digits, starting
// with 0 or 1, written as 0123.456.749 or BE0123456749. The last two digits are
// 97 minus (the first 8 digits mod 97).

export function normalizeCompanyNumber(raw: unknown): string {
  return String(raw ?? '')
    .toUpperCase()
    .replace(/^BE/, '')
    .replace(/\D/g, '');
}

export function isValidCompanyNumber(raw: unknown): boolean {
  const digits = normalizeCompanyNumber(raw);
  if (!/^[01]\d{9}$/.test(digits)) {
    return false;
  }
  const base = parseInt(digits.slice(0, 8), 10);
  const check = parseInt(digits.slice(8, 10), 10);
  return check === 97 - (base % 97);
}

/** 0123456749 -> 0123.456.749 */
export function formatCompanyNumber(raw: unknown): string {
  const digits = normalizeCompanyNumber(raw);
  return digits.length === 10
    ? `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`
    : String(raw ?? '');
}
