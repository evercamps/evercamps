import { addProcessor, hookAfter } from './core.js';
import { isValidNationalNumber, isTruthyFlag } from './lib/nationalNumber.js';
import { copyPayerNationalNumbers } from './services/payerNationalNumber.js';
import { moveFiscalDataOnMerge } from './services/participantMerge.js';

interface ParticipantData {
  national_number?: string;
  national_number_not_applicable?: boolean | number | string;
  [key: string]: any;
}

function validateNationalNumber(data: ParticipantData): ParticipantData {
  if (isTruthyFlag(data.national_number_not_applicable)) {
    return data;
  }
  if (!isValidNationalNumber(data.national_number)) {
    throw new Error(
      'National number is invalid. Check the number, or tick "Not applicable" for non-Belgian participants.'
    );
  }
  return data;
}

// A fiscal attest is only possible for products that manage registrations:
// when a product is saved with registrations off, it's never eligible. (The
// admin form already disables the choice; this also covers the API and the
// importer.)
function enforceFiscalAttestNeedsRegistrations(data: Record<string, any>): Record<string, any> {
  const registrations = data.manage_registrations;
  if (registrations !== undefined && !isTruthyFlag(registrations) && registrations !== 'true') {
    return { ...data, fiscal_attest_eligible: 0 };
  }
  return data;
}

// Checkout participant fields this plugin offers in Camp settings. Their codes
// match columns: national_number is copied to participant.national_number by
// core (orderCreator fills empty participant columns), payer_national_number
// to order_item_registration / customer by copyPayerNationalNumbers.
const NATIONAL_NUMBER_FIELDS = [
  { code: 'national_number', label: 'Rijksregisternummer kind', type: 'text', placeholder: 'YY.MM.DD-XXX.XX' },
  { code: 'payer_national_number', label: 'Rijksregisternummer ouder', type: 'text', placeholder: 'YY.MM.DD-XXX.XX' }
];

function addNationalNumberFields(fields: any[]): any[] {
  const codes = new Set(fields.map((f) => f.code));
  return [...fields, ...NATIONAL_NUMBER_FIELDS.filter((f) => !codes.has(f.code))];
}

// Validates and normalizes (digits only) the national numbers entered at
// checkout. Empty values are allowed here; "required" is a Camp setting that
// core checks before this runs.
function validateCheckoutNationalNumbers(
  data: Record<string, string>,
  context: { fields?: { code: string; label: string }[] } = {}
): Record<string, string> {
  const result = { ...data };
  for (const { code } of NATIONAL_NUMBER_FIELDS) {
    const value = result[code];
    if (!value) {
      continue;
    }
    if (!isValidNationalNumber(value)) {
      const label = context.fields?.find((f) => f.code === code)?.label ?? code;
      throw new Error(`${label}: this is not a valid Belgian national number`);
    }
    result[code] = String(value).replace(/\D/g, '');
  }
  return result;
}

export default async (): Promise<void> => {
  addProcessor('participantDataBeforeCreate', validateNationalNumber, 20);
  addProcessor('participantDataBeforeUpdate', validateNationalNumber, 20);
  addProcessor('productDataBeforeCreate', enforceFiscalAttestNeedsRegistrations, 20);
  addProcessor('productDataBeforeUpdate', enforceFiscalAttestNeedsRegistrations, 20);

  // Checkout: national numbers of child and payer (enable them in Camp settings).
  addProcessor('availableParticipantCheckoutFields', addNationalNumberFields, 20);
  addProcessor('participantCheckoutExtraData', validateCheckoutNationalNumbers, 20);
  hookAfter('saveOrderItems', copyPayerNationalNumbers, 20);

  // Merge tool (camp module): keep attests and the national number with the
  // participant that's kept. Runs inside the merge transaction.
  addProcessor('participantMergeBeforeDelete', moveFiscalDataOnMerge, 20);
};
