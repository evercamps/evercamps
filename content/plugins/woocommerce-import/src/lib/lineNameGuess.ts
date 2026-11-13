// Pure guessing for the "Unmapped order lines" page (services/lineNameMap.ts):
// which variant a WooCommerce order line name refers to. No I/O, so it's
// unit-tested in lineNameGuess.test.ts.

export interface GuessableVariant {
  variantId: number;
  title: string | null;
  // attribute options of the variant, e.g. "Week 1 zomer 2022 (2022-07-04)"
  options: string;
}

const DATE = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g;
const YEAR = /\b((?:19|20)\d{2})\b/g;

function yearsIn(text: string): number[] {
  return [...text.matchAll(YEAR)].map((m) => parseInt(m[1], 10));
}

/** Last year mentioned in a line name, e.g. "Kamp X 2022 - Week 1 zomer" -> 2022. */
export function yearOfLineName(name: string): number | null {
  const years = yearsIn(name);
  return years.length > 0 ? years[years.length - 1] : null;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !/^(?:19|20)\d{2}$/.test(t));
}

/**
 * Best guess of the variant a line name refers to. The part after " - " is
 * the WooCommerce variation ("Week 1 zomer"); its words (dates left out) are matched against
 * the variant's title and options. Every number in it must match (week 1 is
 * not week 10). When the line's year is known, a variant of another year -
 * or without a year (a pre-season "Zomer 1") - is ruled out. Only a single
 * best match is suggested.
 */
export function suggestVariant(
  lineName: string,
  variants: GuessableVariant[],
  // season of the line when its name has no year (from the order date)
  fallbackYear: number | null = null
): number | null {
  if (variants.length === 0) {
    return null;
  }
  const dash = lineName.search(/\s[-–]\s/);
  // Dates ("Zomer 1: 06/07 - 10/07 - kermis") aren't week numbers.
  const variationPart = (dash >= 0 ? lineName.slice(dash + 3) : lineName).replace(DATE, ' ');
  const lineTokens = [...new Set(tokens(variationPart))];
  const lineNumbers = lineTokens.filter((t) => /^\d+$/.test(t));
  const lineYear = yearOfLineName(lineName) ?? fallbackYear;

  let best: number | null = null;
  let bestScore = 0;
  let tie = false;
  for (const variant of variants) {
    const text = `${variant.title ?? ''} ${variant.options}`;
    const variantTokens = new Set(tokens(text));
    if (lineNumbers.some((n) => !variantTokens.has(n))) {
      continue;
    }
    const variantYears = yearsIn(text);
    let score = lineTokens.filter((t) => variantTokens.has(t)).length;
    if (lineYear !== null) {
      if (!variantYears.includes(lineYear)) {
        continue;
      }
      score += 2;
    }
    if (score > bestScore) {
      best = variant.variantId;
      bestScore = score;
      tie = false;
    } else if (score === bestScore) {
      tie = true;
    }
  }
  return bestScore >= 2 && !tie ? best : null;
}

/**
 * Option text for a new period option from a line name:
 * "Kleuterkamp 2021 - Zomer 1" -> "Zomer 1 2021",
 * "Kleuterkamp - Zomer 1: 06/07 - 10/07 - kermis" (2020) -> "Zomer 1 2020".
 */
export function optionTextFromLineName(lineName: string, year: number | null): string {
  const dash = lineName.search(/\s[-–]\s/);
  let text = dash >= 0 ? lineName.slice(dash + 3) : lineName;
  text = text.split(':')[0];
  text = text.replace(DATE, ' ').replace(YEAR, ' ');
  text = text.replace(/\s+/g, ' ').replace(/^[\s\-–]+|[\s\-–]+$/g, '').trim();
  return year ? `${text} ${year}`.trim() : text;
}

function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Start and end date written in a line name ("Zomer 1: 06/07 - 10/07",
 * "Basketkamp 28/12/20 tot en met 30/12/20"). A date without a year gets
 * `year`; an end before the start rolls into the next year.
 */
export function datesFromLineName(
  lineName: string,
  year: number | null
): { startDate: string; endDate: string } | null {
  const matches = [...lineName.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\b/g)];
  if (matches.length < 2) {
    return null;
  }
  const yearOf = (m: RegExpMatchArray) =>
    m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10)) : year;
  const startYear = yearOf(matches[0]);
  let endYear = yearOf(matches[1]);
  if (startYear === null || endYear === null) {
    return null;
  }
  const startDate = isoDate(startYear, parseInt(matches[0][2], 10), parseInt(matches[0][1], 10));
  let endDate = isoDate(endYear, parseInt(matches[1][2], 10), parseInt(matches[1][1], 10));
  if (!startDate || !endDate) {
    return null;
  }
  if (endDate < startDate && !matches[1][3]) {
    endYear += 1;
    endDate = isoDate(endYear, parseInt(matches[1][2], 10), parseInt(matches[1][1], 10));
  }
  return endDate && endDate >= startDate ? { startDate, endDate } : null;
}
