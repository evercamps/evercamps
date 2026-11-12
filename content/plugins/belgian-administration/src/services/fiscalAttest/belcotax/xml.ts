import type { ChangeType, FicheData } from '../fiches.js';
import type { AuthorityType } from '../settings.js';

// Pure: Belcotax-on-web XML for 281.86 fiches (core/.docs/fiscal-attests.md,
// Phase 5). Zone names and order follow the Belcotax brochure (161) and the
// Tactics/FodAttest28186 library; amounts in euro cents, dates DD-MM-YYYY.
// The structure changes little between years, but check every new income
// year against the official XSD / BowConvert86 before uploading.
//
// Verzendingen > Verzending (v00xx)
//   > Aangiften > Aangifte (a10xx)
//     > Opgaven > Opgave32586 > Fiche28186 (f2xxx / f86_xxxx) ...
//     r80xx totals per declaration
//   r90xx totals per file

export type BelcotaxEnvironment = 'test' | 'production';

export interface BelcotaxSender {
  companyNumber: string; // digits only (KBO)
  legalName: string;
  address: string;
  postcode: string;
  city: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface BelcotaxFile {
  incomeYear: number;
  environment: BelcotaxEnvironment;
  // 0 = first upload of the year, 1 = every later (correction) upload
  sendType: 'original' | 'correction';
  sender: BelcotaxSender;
  fiches: FicheData[];
  createdAt?: Date;
}

export const CHANGE_TYPE_CODE: Record<ChangeType, number> = {
  original: 0,
  modification: 1,
  addition: 2,
  cancellation: 3
};

// f86_2031: 1 = Kind & Gezin / ONE / Duitstalige gemeenschap, 2 = public
// authority (municipality, province, community), 3 = abroad, 4 = school.
// Sport federations are recognised by a community (2); verify with the
// accountant.
export const CERTIFICATION_CODE: Record<AuthorityType, number> = {
  municipality: 2,
  opgroeien: 1,
  one: 1,
  school: 4,
  sport: 2
};

export function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cut(value: unknown, max: number): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

/** YYYY-MM-DD (or Date) -> DD-MM-YYYY */
export function belcotaxDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) {
    const d = String(value.getDate()).padStart(2, '0');
    const m = String(value.getMonth() + 1).padStart(2, '0');
    return `${d}-${m}-${value.getFullYear()}`;
  }
  const [y, m, d] = String(value).slice(0, 10).split('-');
  return y && m && d ? `${d}-${m}-${y}` : '';
}

/** Euro -> integer cents */
export function toCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

function digits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Split a payer's full name into last name (f2013) and first names (f2114).
 * Customers only have a full name, so: if it starts or ends with the child's
 * last name, that part is the last name; otherwise the first word is the
 * first name and the rest the last name ("Jan Van den Broeck").
 */
export function splitPayerName(fullName: string, childLastName = ''): { lastName: string; firstNames: string } {
  const name = cut(fullName, 200);
  const family = cut(childLastName, 200);
  if (family && name.length > family.length) {
    const lower = name.toLowerCase();
    const f = family.toLowerCase();
    if (lower.endsWith(` ${f}`)) {
      return { lastName: name.slice(name.length - family.length), firstNames: name.slice(0, name.length - family.length).trim() };
    }
    if (lower.startsWith(`${f} `)) {
      return { lastName: name.slice(0, family.length), firstNames: name.slice(family.length).trim() };
    }
  }
  const space = name.indexOf(' ');
  if (space < 0) {
    return { lastName: name, firstNames: '' };
  }
  return { lastName: name.slice(space + 1), firstNames: name.slice(0, space) };
}

function zone(name: string, value: unknown): string {
  return `<${name}>${escapeXml(value)}</${name}>`;
}

export interface FicheTotals {
  totalCents: number;
  controlCents: number; // f86_2059 = 2 x total
}

export function ficheTotals(fiche: FicheData): FicheTotals {
  const totalCents = fiche.periods.reduce((sum, p) => sum + toCents(p.amount), 0);
  return { totalCents, controlCents: totalCents * 2 };
}

function ficheXml(fiche: FicheData, year: number, sender: BelcotaxSender): string {
  const periods = [0, 1, 2, 3].map((i) => fiche.periods[i] ?? null);
  const amount = (i: number) => (periods[i] ? toCents(periods[i]!.amount) : '');
  const days = (i: number) => (periods[i] ? periods[i]!.days : '');
  const tariff = (i: number) =>
    periods[i] ? Math.round(toCents(periods[i]!.amount) / Math.max(1, periods[i]!.days)) : '';
  const begin = (i: number) => belcotaxDate(periods[i]?.startDate);
  const end = (i: number) => belcotaxDate(periods[i]?.endDate);
  const { totalCents, controlCents } = ficheTotals(fiche);
  const payer = splitPayerName(fiche.payer.fullName, fiche.child.lastName);
  const address = fiche.payer.address ?? {};
  const authority = fiche.authority;

  return [
    '<Fiche28186>',
    zone('f2002_inkomstenjaar', year),
    zone('f2005_registratienummer', sender.companyNumber),
    zone('f2008_typefiche', '28186'),
    zone('f2009_volgnummer', fiche.sequenceNumber),
    zone('f2010_referentie', `${year}-${fiche.sequenceNumber}`),
    zone('f2011_nationaalnr', digits(fiche.payer.nationalNumber)),
    zone('f2013_naam', cut(payer.lastName, 41)),
    zone('f2015_adres', cut(address.street, 200)),
    zone('f2016_postcodebelgisch', cut(address.postcode, 4)),
    zone('f2017_gemeente', cut(address.city, 27)),
    zone('f2018_landwoonplaats', '0'),
    zone('f2028_typetraitement', CHANGE_TYPE_CODE[fiche.changeType] ?? 0),
    zone('f2029_enkelopgave325', '0'),
    zone('f2114_voornamen', cut(payer.firstNames, 30)),
    zone('f86_2031_certificationautorisation', CERTIFICATION_CODE[authority.type] ?? 2),
    zone('f86_2055_begindate1', begin(0)),
    zone('f86_2056_enddate1', end(0)),
    zone('f86_2059_totaalcontrole', controlCents),
    zone('f86_2060_amount1', amount(0)),
    zone('f86_2061_amount2', amount(1)),
    zone('f86_2062_amount3', amount(2)),
    zone('f86_2063_amount4', amount(3)),
    zone('f86_2064_totalamount', totalCents),
    zone('f86_2093_begindate2', begin(1)),
    zone('f86_2100_certifierpostnr', cut(authority.postcode, 4)),
    // the child lives with the payer
    zone('f86_2101_childcountry', '0'),
    zone('f86_2102_childaddress', cut(address.street, 41)),
    zone('f86_2106_childname', cut(fiche.child.lastName, 41)),
    zone('f86_2107_childfirstname', cut(fiche.child.firstName, 30)),
    zone('f86_2109_certifiercbenumber', digits(authority.companyNumber)),
    zone('f86_2110_numberofday1', days(0)),
    zone('f86_2111_dailytariff1', tariff(0)),
    zone('f86_2113_numberofday2', days(1)),
    zone('f86_2115_dailytariff2', tariff(1)),
    zone('f86_2116_numberofday3', days(2)),
    zone('f86_2117_dailytariff3', tariff(2)),
    zone('f86_2119_numberofday4', days(3)),
    zone('f86_2120_dailytariff4', tariff(3)),
    zone('f86_2139_childpostnr', cut(address.postcode, 4)),
    zone('f86_2140_childmunicipality', cut(address.city, 27)),
    zone('f86_2144_enddate2', end(1)),
    zone('f86_2153_nnchild', digits(fiche.child.nationalNumber)),
    zone('f86_2154_certifiermunicipality', cut(authority.city, 27)),
    zone('f86_2155_certifiername', cut(authority.name, 41)),
    zone('f86_2156_certifieradres', cut(authority.address, 41)),
    zone('f86_2157_begindate3', begin(2)),
    zone('f86_2158_enddate3', end(2)),
    zone('f86_2161_begindate4', begin(3)),
    zone('f86_2162_enddate4', end(3)),
    zone('f86_2163_childbirthdate', belcotaxDate(fiche.child.birthDate)),
    '</Fiche28186>'
  ].join('');
}

export interface BelcotaxTotals {
  fiches: number;
  sequenceSum: number; // r8011 / r9012
  controlSum: number; // r8012 / r9013
}

export function belcotaxTotals(fiches: FicheData[]): BelcotaxTotals {
  return {
    fiches: fiches.length,
    sequenceSum: fiches.reduce((sum, f) => sum + f.sequenceNumber, 0),
    controlSum: fiches.reduce((sum, f) => sum + ficheTotals(f).controlCents, 0)
  };
}

export function buildBelcotaxXml(file: BelcotaxFile): string {
  if (file.fiches.length === 0) {
    throw new Error('A Belcotax file needs at least one fiche');
  }
  const { incomeYear: year, sender } = file;
  const fiches = [...file.fiches].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const totals = belcotaxTotals(fiches);
  const name = cut(sender.legalName, 59);

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Verzendingen><Verzending>',
    zone('v0002_inkomstenjaar', year),
    zone('v0010_bestandtype', file.environment === 'production' ? 'BELCOTAX' : 'BELCOTST'),
    zone('v0011_aanmaakdatum', belcotaxDate(file.createdAt ?? new Date())),
    zone('v0014_naam', cut(sender.legalName, 41)),
    zone('v0015_adres', cut(sender.address, 200)),
    zone('v0016_postcode', cut(sender.postcode, 4)),
    zone('v0017_gemeente', cut(sender.city, 27)),
    zone('v0018_telefoonnummer', digits(sender.contactPhone)),
    zone('v0021_contactpersoon', cut(sender.contactName, 34)),
    zone('v0022_taalcode', '1'),
    zone('v0023_emailadres', cut(sender.contactEmail, 44)),
    zone('v0024_nationaalnr', digits(sender.companyNumber)),
    zone('v0025_typeenvoi', file.sendType === 'original' ? '0' : '1'),
    zone('v0028_landwoonplaats', '0'),
    '<Aangiften><Aangifte>',
    zone('a1002_inkomstenjaar', year),
    zone('a1005_registratienummer', digits(sender.companyNumber)),
    zone('a1011_naamnl1', name.slice(0, 28)),
    name.length > 28 ? zone('a1012_naamnl2', name.slice(28)) : '',
    zone('a1013_adresnl', cut(sender.address, 200)),
    zone('a1014_postcodebelgisch', cut(sender.postcode, 4)),
    zone('a1015_gemeente', cut(sender.city, 27)),
    zone('a1016_landwoonplaats', '0'),
    zone('a1020_taalcode', '1'),
    '<Opgaven><Opgave32586>',
    ...fiches.map((f) => ficheXml(f, year, { ...sender, companyNumber: digits(sender.companyNumber) })),
    '</Opgave32586></Opgaven>',
    zone('r8002_inkomstenjaar', year),
    zone('r8005_registratienummer', digits(sender.companyNumber)),
    zone('r8010_aantalrecords', totals.fiches + 2),
    zone('r8011_controletotaal', totals.sequenceSum),
    zone('r8012_controletotaal', totals.controlSum),
    zone('r8013_totaalvoorheffingen', 0),
    '</Aangifte></Aangiften>',
    zone('r9002_inkomstenjaar', year),
    zone('r9010_aantallogbestanden', 3),
    zone('r9011_totaalaantalrecords', totals.fiches + 4),
    zone('r9012_controletotaal', totals.sequenceSum),
    zone('r9013_controletotaal', totals.controlSum),
    zone('r9014_controletotaal', 0),
    '</Verzending></Verzendingen>',
    ''
  ].join('\n');
}
