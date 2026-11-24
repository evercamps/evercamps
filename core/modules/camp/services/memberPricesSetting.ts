import { getSetting } from '../../setting/services/setting.js';

// The Camp settings switch for member prices (#210, ADR-0006). Off by default:
// member prices and membership numbers are then ignored everywhere (prices,
// forms, admin), but stay stored, so turning it back on restores them.

export const MEMBER_PRICES_SETTING = 'memberPricesEnabled';

/** Whether a stored switch value means "on" ('1', 1, true or 'true') */
export function isSwitchOn(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

/** Whether member prices are switched on in Camp settings */
export async function memberPricesEnabled(): Promise<boolean> {
  return isSwitchOn(await getSetting<unknown>(MEMBER_PRICES_SETTING, 0));
}
