// Member price (ADR-0006, GLOSSARY "Membership", "Member price").
//
// A registration with a membership number, on a variant with a member price,
// costs the member price. The number is an extra participant field
// (`membership_number`) that is not configured in Camp settings: the
// participant form shows it, always optional, whenever the chosen variant has
// a member price. Empty = not a member = the normal price.

export const MEMBERSHIP_NUMBER_FIELD = 'membership_number';

interface RegistrationLike {
  extraData?: unknown;
}

function toObject(extraData: unknown): Record<string, unknown> {
  if (typeof extraData === 'string') {
    try {
      const parsed = JSON.parse(extraData);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return extraData && typeof extraData === 'object' ? (extraData as Record<string, unknown>) : {};
}

/** The trimmed membership number in a registration's extra data, or null */
export function membershipNumberOf(extraData: unknown): string | null {
  const value = toObject(extraData)[MEMBERSHIP_NUMBER_FIELD];
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text === '' ? null : text;
}

/**
 * Whether a cart line gets the member price: it has registrations and every
 * one of them has a membership number. A new line holds exactly one
 * registration; lines merged before ADR-0006 only qualify when all do.
 */
export function isMemberLine(registrations: RegistrationLike[] | null | undefined): boolean {
  if (!Array.isArray(registrations) || registrations.length === 0) {
    return false;
  }
  return registrations.every((registration) => membershipNumberOf(registration.extraData) !== null);
}

function toAmount(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const amount = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isNaN(amount) ? null : amount;
}

/** The unit price of a cart line: the member price for a member line, else the price */
export function linePrice(
  price: number | string,
  memberPrice: number | string | null | undefined,
  registrations: RegistrationLike[] | null | undefined
): number {
  const normal = toAmount(price) ?? 0;
  const member = toAmount(memberPrice);
  return member !== null && isMemberLine(registrations) ? member : normal;
}
