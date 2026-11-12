import { getValue, getValueSync } from '../../../lib/util/registry.js';
import { getSetting } from '../../setting/services/setting.js';

// Extra participant fields asked when a participant is added to the cart
// (e.g. date of birth). Two levels:
//
// - *available* fields: what an admin can choose from in Camp settings. Core
//   offers birth_date; plugins add their own through the
//   `availableParticipantCheckoutFields` value processor (e.g. the
//   belgian-administration plugin adds national_number), from their bootstrap:
//
//     addProcessor('availableParticipantCheckoutFields', (fields) => [
//       ...fields,
//       { code: 'national_number', label: 'National number', type: 'text' }
//     ]);
//
// - *configured* fields: the ones the admin enabled (setting
//   participant_checkout_fields), with label / required / useForUniqueness.
//
// Values are stored per registration in cart_item_registration.extra_data and
// order_item_registration.extra_data.

export interface AvailableParticipantField {
  code: string;
  label: string;
  type: 'text' | 'date' | 'select';
  // Optional hint shown under the field (e.g. the expected format).
  placeholder?: string;
}

export interface ConfiguredParticipantField {
  code: string;
  label: string;
  type: 'text' | 'date' | 'select';
  required: boolean;
  useForUniqueness: boolean;
}

const CORE_FIELDS: AvailableParticipantField[] = [
  { code: 'birth_date', label: 'Date of Birth', type: 'date' }
];

export function getAvailableParticipantCheckoutFields(): AvailableParticipantField[] {
  return getValueSync<AvailableParticipantField[]>(
    'availableParticipantCheckoutFields',
    CORE_FIELDS,
    {}
  );
}

export async function getConfiguredParticipantCheckoutFields(): Promise<ConfiguredParticipantField[]> {
  const raw = await getSetting<unknown>('participant_checkout_fields', null);
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isTrue(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

/**
 * Pick the configured extra fields from a request body (or an extraData
 * object), check required ones and let plugins validate/normalize them through
 * the `participantCheckoutExtraData` value processor (throw an Error to reject;
 * the message is shown to the customer). Returns undefined when there's
 * nothing to store.
 */
export async function collectParticipantExtraData(
  source: Record<string, unknown> | string | null | undefined
): Promise<Record<string, string> | undefined> {
  let values: Record<string, unknown> = {};
  if (typeof source === 'string') {
    try {
      values = JSON.parse(source) || {};
    } catch {
      values = {};
    }
  } else if (source && typeof source === 'object') {
    values = source;
  }

  const fields = await getConfiguredParticipantCheckoutFields();
  const collected: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field.code];
    const text = value === undefined || value === null ? '' : String(value).trim();
    if (text === '') {
      if (isTrue(field.required)) {
        throw new Error(`${field.label} is required`);
      }
      continue;
    }
    collected[field.code] = text;
  }

  const result = await getValue<Record<string, string>>(
    'participantCheckoutExtraData',
    collected,
    { fields }
  );
  return result && Object.keys(result).length > 0 ? result : undefined;
}
