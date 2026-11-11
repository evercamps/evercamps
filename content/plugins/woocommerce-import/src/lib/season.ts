// Camp weeks are split per season: the WooCommerce variation "Kampweek: Week 1
// zomer" is reused every year, but in evercamps each season gets its own
// option ("Week 1 zomer 2027") and its own variant, so registrations, dates
// and fiscal attests of different years stay apart.
//
// Season of an order: orders placed from 1 October count for the next year
// (2026-10-01 -> 2027); before that, the same year (2026-09-30 -> 2026).

/** attribute_code of the attribute that is split per season. */
export const SEASON_ATTRIBUTE_CODE = 'kampweek';

/** First month (1-12) that counts for the next season. */
export const SEASON_START_MONTH = 10;

const YEAR_SUFFIX = /\s+(\d{4})$/;
const SKU_YEAR_SUFFIX = /-(\d{4})$/;

export function slugifyAttributeCode(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function isSeasonAttribute(attributeNameOrCode: string): boolean {
  // WooCommerce global attributes can show up as "pa_kampweek".
  return slugifyAttributeCode(attributeNameOrCode).replace(/^pa_/, '') === SEASON_ATTRIBUTE_CODE;
}

/**
 * Season (year) for a date. WooCommerce dates come without a timezone
 * ("2026-10-01T09:30:00"), which `new Date` reads as local time.
 */
export function seasonForDate(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date for season: ${String(date)}`);
  }
  return d.getMonth() + 1 >= SEASON_START_MONTH ? d.getFullYear() + 1 : d.getFullYear();
}

/** "Week 1 zomer 2026" -> "Week 1 zomer" */
export function stripSeason(optionText: string): string {
  return optionText.replace(YEAR_SUFFIX, '').trim();
}

/** "Week 1 zomer" / "Week 1 zomer 2026" -> "Week 1 zomer 2027" */
export function withSeason(optionText: string, season: number): string {
  return `${stripSeason(optionText)} ${season}`;
}

/** Year suffix of an option text, or null for an option without one. */
export function seasonOf(optionText: string): number | null {
  const match = optionText.match(YEAR_SUFFIX);
  return match ? parseInt(match[1], 10) : null;
}

/** "ABC-2026" -> "ABC" */
export function stripSkuSeason(sku: string): string {
  return sku.replace(SKU_YEAR_SUFFIX, '');
}

/**
 * WooCommerce has a product per camp type per year:
 * "Golfsurfen-watersporten-omnisport 2022" -> { baseName: "Golfsurfen-watersporten-omnisport", year: 2022 }.
 * A name without a trailing year -> { baseName: name, year: null }.
 */
export function parseCampProductName(name: string): { baseName: string; year: number | null } {
  // Lazy base + separators ("2022", "- 2022", "– 2022") + year at the end.
  const match = name.trim().match(/^(.*?)[\s\-–]+((?:19|20)\d{2})$/);
  if (!match) {
    return { baseName: name.trim(), year: null };
  }
  return { baseName: match[1].trim(), year: parseInt(match[2], 10) };
}

/** Key that identifies a camp type across years: slug of the base name. */
export function campKey(baseName: string): string {
  return baseName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Give the season attribute of a variation the season suffix; other attributes stay as they are. */
export function applySeason<T extends { attribute_name: string; option_text: string }>(
  attributes: T[],
  season: number
): T[] {
  return attributes.map((attribute) =>
    isSeasonAttribute(attribute.attribute_name)
      ? { ...attribute, option_text: withSeason(attribute.option_text, season) }
      : attribute
  );
}
