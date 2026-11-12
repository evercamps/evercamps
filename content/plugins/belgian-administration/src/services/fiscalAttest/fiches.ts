import type { AttestDraft, AttestPeriodLine, PayerShare } from './buildAttests.js';
import { cents } from './buildAttests.js';
import type { AuthorityType, FiscalAttestSettings } from './settings.js';

// Pure: turns built attests into Belcotax fiches (core/.docs/fiscal-attests.md,
// Phase 5). A 281.86 fiche holds at most 4 periods, so an attest with more is
// split over several fiches, each with its own volgnummer. `data` of a
// fiscal_attest row is a FicheData snapshot; the XML and the PDF are built
// from it only.

export const MAX_PERIODS_PER_FICHE = 4;

export type ChangeType = 'original' | 'modification' | 'addition' | 'cancellation';

export interface FicheData {
  // stable within a year: participant + payer + chunk (#1, #2, ...)
  key: string;
  incomeYear: number;
  sequenceNumber: number;
  changeType: ChangeType;
  organiser: { companyNumber: string; legalName: string; address: string; postcode: string; city: string };
  authority: {
    type: AuthorityType;
    name: string;
    reference: string;
    companyNumber: string;
    address: string;
    postcode: string;
    city: string;
  };
  signatory: { name: string; function: string };
  child: AttestDraft['child'];
  payer: PayerShare;
  periods: AttestPeriodLine[];
  totalAmount: number;
  totalDays: number;
  generatedAt: string;
}

/** Split an attest into chunks of max 4 periods (by start date). */
export function chunkAttest(attest: AttestDraft): AttestDraft[] {
  const periods = [...attest.periods].sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.registrationId - b.registrationId
  );
  const chunks: AttestDraft[] = [];
  for (let i = 0; i < periods.length; i += MAX_PERIODS_PER_FICHE) {
    const part = periods.slice(i, i + MAX_PERIODS_PER_FICHE);
    chunks.push({
      ...attest,
      key: `${attest.key}#${chunks.length + 1}`,
      periods: part,
      totalAmount: cents(part.reduce((sum, p) => sum + p.amount, 0)),
      totalDays: part.reduce((sum, p) => sum + p.days, 0)
    });
  }
  return chunks;
}

export function toFicheData(
  chunk: AttestDraft,
  settings: FiscalAttestSettings,
  sequenceNumber: number,
  changeType: ChangeType
): FicheData {
  const { editUrl: _editUrl, ...payer } = chunk.payer;
  return {
    key: chunk.key,
    incomeYear: chunk.incomeYear,
    sequenceNumber,
    changeType,
    organiser: {
      companyNumber: settings.companyNumber,
      legalName: settings.legalName,
      address: settings.address,
      postcode: settings.postcode,
      city: settings.city
    },
    authority: {
      type: settings.authorityType,
      name: settings.authorityName,
      reference: settings.authorityReference,
      companyNumber: settings.authorityCompanyNumber,
      address: settings.authorityAddress,
      postcode: settings.authorityPostcode,
      city: settings.authorityCity
    },
    signatory: { name: settings.signatoryName, function: settings.signatoryFunction },
    child: chunk.child,
    payer: { ...payer, sharePercent: 100 },
    periods: chunk.periods,
    totalAmount: chunk.totalAmount,
    totalDays: chunk.totalDays,
    generatedAt: new Date().toISOString()
  };
}

/**
 * What ends up on the fiche: two fiches with the same fingerprint need no
 * correction. (Organiser/signatory changes alone don't trigger corrections.)
 */
export function ficheFingerprint(data: Pick<FicheData, 'child' | 'payer' | 'periods' | 'authority'>): string {
  const p = data.payer;
  return JSON.stringify({
    child: [data.child.firstName, data.child.lastName, data.child.birthDate, data.child.nationalNumber],
    payer: [p.fullName, p.nationalNumber, p.address?.street, p.address?.postcode, p.address?.city, p.address?.country],
    authority: [data.authority.type, data.authority.companyNumber, data.authority.name],
    periods: data.periods.map((l) => [l.startDate, l.endDate, l.days, cents(l.amount)])
  });
}
