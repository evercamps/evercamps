// Belgian national number (known in Dutch as "rijksregisternummer", in French as
// "numéro de registre national"). Format: 11 digits — YYMMDD (birth date, 00 used
// for unknown month/day) + 3-digit sequence number + 2-digit checksum. The checksum
// is 97 minus the remainder of the first 9 digits divided by 97; people born from
// 2000 onward use the same formula with 2000000000 added first, since the number
// space was extended for the new century. We only validate the checksum, not the
// birth-date plausibility, because the unknown-birthdate encoding (00 for
// month/day) makes date validation unreliable.
function computeCheck(base: number): number {
  const remainder = base % 97;
  return remainder === 0 ? 97 : 97 - remainder;
}

export function isValidNationalNumber(raw: unknown): boolean {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length !== 11) {
    return false;
  }
  const base = parseInt(digits.slice(0, 9), 10);
  const check = parseInt(digits.slice(9, 11), 10);
  return check === computeCheck(base) || check === computeCheck(2000000000 + base);
}

export function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

/** 85073003328 -> 85.07.30-033.28 (anything else is returned unchanged) */
export function formatNationalNumber(raw: unknown): string {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (d.length !== 11) return String(raw ?? '');
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}-${d.slice(6, 9)}.${d.slice(9)}`;
}
