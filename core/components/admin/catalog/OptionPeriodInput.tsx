import React from 'react';

// Start date / end date / days of a "period" attribute option (e.g. kampweek
// "Week 1 zomer 2026" = 2026-07-06 .. 2026-07-10, 5 days). Native date
// pickers, controlled. Shared by the attribute edit page and the fiscal
// attests page (belgian-administration plugin), so dates are entered the same
// way everywhere.

export interface OptionPeriodValue {
  startDate: string; // YYYY-MM-DD or ''
  endDate: string;
  dayCount: string; // '' = count the weekdays between the dates
}

interface OptionPeriodInputProps {
  value: OptionPeriodValue;
  onChange: (value: OptionPeriodValue) => void;
  // show "Start date / End date / Days" above the inputs
  showLabels?: boolean;
  // mark empty dates (e.g. a new option, where dates are required)
  required?: boolean;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function parse(date: string): Date | null {
  if (!DATE.test(date)) return null;
  const value = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(value.getTime()) ? null : value;
}

/** Monday-Friday days between two dates, both included (same rule as the fiscal attests). */
export function weekdaysBetween(startDate: string, endDate: string): number {
  const start = parse(startDate);
  const end = parse(endDate);
  if (!start || !end || end < start) return 0;
  let days = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const weekday = d.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}

/** A camp week runs Monday to Friday: start + 4 days. */
function defaultEndDate(startDate: string): string {
  const start = parse(startDate);
  if (!start) return '';
  start.setUTCDate(start.getUTCDate() + 4);
  return start.toISOString().slice(0, 10);
}

export function OptionPeriodInput({
  value,
  onChange,
  showLabels = true,
  required = false
}: OptionPeriodInputProps) {
  const start = parse(value.startDate);
  const end = parse(value.endDate);
  const invalid = !!start && !!end && end < start;
  const autoDays = start && end && !invalid ? weekdaysBetween(value.startDate, value.endDate) : null;

  const setStart = (startDate: string) => {
    // Filling in the start of a week proposes its end (Friday); an end that is
    // already set and still after the start is kept.
    const keepEnd = value.endDate && parse(value.endDate) && parse(startDate) && value.endDate >= startDate;
    onChange({ ...value, startDate, endDate: keepEnd ? value.endDate : defaultEndDate(startDate) });
  };

  const missing = (v: string) => required && !v;

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        <label className="block">
          {showLabels && <span className="text-sm">Start date</span>}
          <input
            className={`form-field w-full ${missing(value.startDate) ? 'border-critical' : ''}`}
            type="date"
            value={value.startDate}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="block">
          {showLabels && <span className="text-sm">End date</span>}
          <input
            className={`form-field w-full ${missing(value.endDate) || invalid ? 'border-critical' : ''}`}
            type="date"
            min={value.startDate || undefined}
            value={value.endDate}
            onChange={(e) => onChange({ ...value, endDate: e.target.value })}
          />
        </label>
        <label className="block">
          {showLabels && <span className="text-sm">Days</span>}
          <input
            className="form-field w-full"
            type="number"
            min="1"
            placeholder={autoDays ? `Auto (${autoDays})` : 'Auto'}
            value={value.dayCount}
            onChange={(e) => onChange({ ...value, dayCount: e.target.value })}
          />
        </label>
      </div>
      {invalid && <div className="text-critical text-sm mt-1">The end date is before the start date.</div>}
    </div>
  );
}
