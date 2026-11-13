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
 * not week 10), a different year rules a variant out. Only a single best
 * match is suggested.
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
    if (lineYear !== null && variantYears.length > 0) {
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
