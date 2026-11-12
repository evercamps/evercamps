// Care period of a registration (core/.docs/fiscal-attests.md, 1b): the dated
// attribute option ("Week 1 zomer 2027" = start_date..end_date, day_count) on
// its variant, or else on its product. Framework-free, so it's unit-testable.

export interface PeriodOption {
  // 1 = option of the registration's variant, 2 = option of its product
  sourceRank: 1 | 2;
  optionText: string;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;
  dayCount: number | null;
}

export interface CarePeriod {
  label: string;
  startDate: string;
  endDate: string;
  days: number;
  // true when day_count was empty and days are the weekdays between the dates
  daysDerived: boolean;
}

export type CarePeriodResult =
  | { ok: true; period: CarePeriod }
  | { ok: false; reason: 'no_dates' | 'ambiguous' | 'no_end_date' | 'invalid_dates' };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function parse(date: string): Date | null {
  if (!DATE.test(date)) {
    return null;
  }
  const value = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(value.getTime()) ? null : value;
}

/** Monday-Friday days between two dates, both included. */
export function weekdaysBetween(startDate: string, endDate: string): number {
  const start = parse(startDate);
  const end = parse(endDate);
  if (!start || !end || end < start) {
    return 0;
  }
  let days = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const weekday = d.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      days += 1;
    }
  }
  return days;
}

/** Pick the care period: variant options win over product options. */
export function resolveCarePeriod(options: PeriodOption[]): CarePeriodResult {
  const dated = options.filter((o) => o.startDate || o.endDate);
  if (dated.length === 0) {
    return { ok: false, reason: 'no_dates' };
  }
  const bestRank = Math.min(...dated.map((o) => o.sourceRank));
  const candidates = dated.filter((o) => o.sourceRank === bestRank);
  if (candidates.length > 1) {
    return { ok: false, reason: 'ambiguous' };
  }
  const option = candidates[0];
  if (!option.startDate || !option.endDate) {
    return { ok: false, reason: 'no_end_date' };
  }
  const start = parse(option.startDate);
  const end = parse(option.endDate);
  if (!start || !end || end < start) {
    return { ok: false, reason: 'invalid_dates' };
  }
  const derived = !option.dayCount;
  return {
    ok: true,
    period: {
      label: option.optionText,
      startDate: option.startDate,
      endDate: option.endDate,
      days: derived ? weekdaysBetween(option.startDate, option.endDate) : Number(option.dayCount),
      daysDerived: derived
    }
  };
}

/** Age in whole years on a date (YYYY-MM-DD). */
export function ageOn(birthDate: string, onDate: string): number | null {
  const birth = parse(birthDate);
  const on = parse(onDate);
  if (!birth || !on) {
    return null;
  }
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    on.getUTCMonth() < birth.getUTCMonth() ||
    (on.getUTCMonth() === birth.getUTCMonth() && on.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) {
    age -= 1;
  }
  return age;
}

/**
 * Income year of a registration without a usable period, to still list it
 * (as an issue) in a year: the year at the end of its variant title
 * ("Week 1 zomer 2027"), else the year it was created.
 */
export function fallbackYear(variantTitle: string | null | undefined, createdAt: string | Date): number {
  const match = String(variantTitle ?? '').match(/\s(\d{4})$/);
  return match ? parseInt(match[1], 10) : new Date(createdAt).getFullYear();
}

/** Date column value (pg Date at local midnight, or string) -> YYYY-MM-DD. */
export function toDateString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}
