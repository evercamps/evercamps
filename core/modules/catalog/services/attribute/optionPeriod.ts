// Care period of an attribute option (e.g. the "period" option "Week 1 zomer"
// = 2026-07-06 .. 2026-07-10, 5 days). Columns added in
// catalog/migration/Version-1.1.2.ts; see core/.docs/fiscal-attests.md, 1b.

export type OptionPeriodInput = {
  start_date?: string | null;
  end_date?: string | null;
  day_count?: string | number | null;
};

export type OptionPeriod = {
  start_date: string | null;
  end_date: string | null;
  day_count: number | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text === '' ? null : text;
}

function parseDate(value: string, label: string, optionText: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  if (!DATE_PATTERN.test(value) || Number.isNaN(date.getTime())) {
    throw new Error(`Option "${optionText}": ${label} must be a date (YYYY-MM-DD)`);
  }
  return date;
}

/**
 * Normalize and validate the period fields posted with an option. Empty
 * strings become null. Throws a readable error for invalid input.
 */
export function normalizeOptionPeriod(
  option: OptionPeriodInput,
  optionText: string
): OptionPeriod {
  const startDate = emptyToNull(option.start_date);
  const endDate = emptyToNull(option.end_date);
  const dayCountText = emptyToNull(option.day_count);

  const start = startDate ? parseDate(startDate, 'start date', optionText) : null;
  const end = endDate ? parseDate(endDate, 'end date', optionText) : null;
  if (start && end && end < start) {
    throw new Error(`Option "${optionText}": end date is before start date`);
  }
  if ((start && !end) || (!start && end)) {
    throw new Error(`Option "${optionText}": fill in both start and end date, or neither`);
  }

  let dayCount: number | null = null;
  if (dayCountText !== null) {
    dayCount = Number(dayCountText);
    if (!Number.isInteger(dayCount) || dayCount < 1) {
      throw new Error(`Option "${optionText}": days must be a whole number of at least 1`);
    }
    if (start && end) {
      const span = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
      if (dayCount > span) {
        throw new Error(
          `Option "${optionText}": ${dayCount} days doesn't fit between start and end date (${span} days)`
        );
      }
    }
  }

  return { start_date: startDate, end_date: endDate, day_count: dayCount };
}

/**
 * node-postgres parses DATE columns into a Date at local midnight; turn that
 * back into YYYY-MM-DD without a timezone shift.
 */
export function formatOptionDate(value: unknown): string | null {
  if (value === null || value === undefined) {
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
