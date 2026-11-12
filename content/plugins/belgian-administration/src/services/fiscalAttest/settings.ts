import { getSetting } from '../../core.js';

// Fiscal attest settings (core/.docs/fiscal-attests.md, 1a), saved from
// /admin/fiscal-attests/settings through core's saveSetting API.

export const AUTHORITY_TYPES = {
  municipality: 'Gemeente / stad',
  opgroeien: 'Opgroeien (Kind & Gezin)',
  one: 'ONE',
  school: 'School',
  sport: 'Erkende sportfederatie / -club'
} as const;

export type AuthorityType = keyof typeof AUTHORITY_TYPES;

export interface MaxDailyRate {
  year: number;
  amount: number;
}

export interface FiscalAttestSettings {
  companyNumber: string;
  legalName: string;
  address: string;
  postcode: string;
  city: string;
  authorityType: AuthorityType;
  authorityName: string;
  authorityReference: string;
  // the recognising body itself (fiche zones 2109 / 2155 / 2156 / 2100 / 2154)
  authorityCompanyNumber: string;
  authorityAddress: string;
  authorityPostcode: string;
  authorityCity: string;
  signatoryName: string;
  signatoryFunction: string;
  senderContactName: string;
  senderContactEmail: string;
  senderContactPhone: string;
  maxDailyRates: MaxDailyRate[];
}

/** Setting names, in one place so the form, GraphQL and services agree. */
export const SETTING_NAMES = {
  companyNumber: 'fiscalAttestCompanyNumber',
  legalName: 'fiscalAttestLegalName',
  address: 'fiscalAttestAddress',
  postcode: 'fiscalAttestPostcode',
  city: 'fiscalAttestCity',
  authorityType: 'fiscalAttestAuthorityType',
  authorityName: 'fiscalAttestAuthorityName',
  authorityReference: 'fiscalAttestAuthorityReference',
  authorityCompanyNumber: 'fiscalAttestAuthorityCompanyNumber',
  authorityAddress: 'fiscalAttestAuthorityAddress',
  authorityPostcode: 'fiscalAttestAuthorityPostcode',
  authorityCity: 'fiscalAttestAuthorityCity',
  signatoryName: 'fiscalAttestSignatoryName',
  signatoryFunction: 'fiscalAttestSignatoryFunction',
  senderContactName: 'fiscalAttestSenderContactName',
  senderContactEmail: 'fiscalAttestSenderContactEmail',
  senderContactPhone: 'fiscalAttestSenderContactPhone',
  maxDailyRates: 'fiscalAttestMaxDailyRates'
} as const;

export function parseMaxDailyRates(raw: unknown): MaxDailyRate[] {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((row: any) => ({ year: parseInt(row?.year, 10), amount: parseFloat(row?.amount) }))
    .filter((row) => Number.isInteger(row.year) && !Number.isNaN(row.amount))
    .sort((a, b) => a.year - b.year);
}

async function text(name: string, fallback = ''): Promise<string> {
  const value = await getSetting(name, fallback);
  return value === null || value === undefined ? fallback : String(value);
}

/**
 * The organiser fields fall back to the store settings (storeName,
 * storeAddress, ...) until they're filled in on the fiscal attest page.
 */
export async function getFiscalAttestSettings(): Promise<FiscalAttestSettings> {
  const authorityType = await text(SETTING_NAMES.authorityType, 'municipality');
  return {
    companyNumber: await text(SETTING_NAMES.companyNumber),
    legalName: await text(SETTING_NAMES.legalName, await text('storeName')),
    address: await text(SETTING_NAMES.address, await text('storeAddress')),
    postcode: await text(SETTING_NAMES.postcode, await text('storePostalCode')),
    city: await text(SETTING_NAMES.city, await text('storeCity')),
    authorityType: (authorityType in AUTHORITY_TYPES ? authorityType : 'municipality') as AuthorityType,
    authorityName: await text(SETTING_NAMES.authorityName),
    authorityReference: await text(SETTING_NAMES.authorityReference),
    authorityCompanyNumber: await text(SETTING_NAMES.authorityCompanyNumber),
    authorityAddress: await text(SETTING_NAMES.authorityAddress),
    authorityPostcode: await text(SETTING_NAMES.authorityPostcode),
    authorityCity: await text(SETTING_NAMES.authorityCity),
    signatoryName: await text(SETTING_NAMES.signatoryName),
    signatoryFunction: await text(SETTING_NAMES.signatoryFunction),
    senderContactName: await text(SETTING_NAMES.senderContactName),
    senderContactEmail: await text(SETTING_NAMES.senderContactEmail, await text('storeEmail')),
    senderContactPhone: await text(SETTING_NAMES.senderContactPhone, await text('storePhoneNumber')),
    maxDailyRates: parseMaxDailyRates(await getSetting(SETTING_NAMES.maxDailyRates, '[]'))
  };
}
