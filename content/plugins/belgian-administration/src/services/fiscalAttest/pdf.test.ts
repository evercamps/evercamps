// Smoke test: the attest PDF renders (one page per fiche).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FicheData } from './fiches.js';
import { renderFichesPdf } from './pdf.js';

const FICHE: FicheData = {
  key: '10:c7#1',
  incomeYear: 2026,
  sequenceNumber: 1,
  changeType: 'original',
  organiser: { companyNumber: '0123456749', legalName: 'Sportkampen vzw', address: 'Sportlaan 1', postcode: '9000', city: 'Gent' },
  authority: {
    type: 'municipality',
    name: 'Stad Gent',
    reference: '',
    companyNumber: '0207451227',
    address: 'Botermarkt 1',
    postcode: '9000',
    city: 'Gent'
  },
  signatory: { name: 'Jan Janssens', function: 'Voorzitter' },
  child: { participantId: 10, firstName: 'Lotte', lastName: 'Peeters', birthDate: '2016-05-01', nationalNumber: '16050100178' },
  payer: {
    customerId: 7,
    fullName: 'An Peeters',
    nationalNumber: '85073003328',
    address: { street: 'Kerkstraat 1', postcode: '9000', city: 'Gent', country: 'BE' },
    sharePercent: 100
  },
  periods: [
    { registrationId: 1, label: 'Week 1 zomer 2026', productName: 'Omnisport', startDate: '2026-07-06', endDate: '2026-07-10', days: 5, amount: 150, dailyRate: 30 }
  ],
  totalAmount: 150,
  totalDays: 5,
  generatedAt: '2027-01-15T10:00:00.000Z'
};

describe('attest pdf', () => {
  it('renders a pdf with one page per fiche', async () => {
    const pdf = await renderFichesPdf([FICHE, { ...FICHE, sequenceNumber: 2, changeType: 'modification' }]);
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length, 2);
  });

  it('refuses an empty list', async () => {
    await assert.rejects(renderFichesPdf([]));
  });
});
