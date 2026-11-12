// Unit tests for fiche chunking and the Belcotax XML (no database).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AttestDraft } from '../buildAttests.js';
import { chunkAttest, ficheFingerprint, toFicheData, type FicheData } from '../fiches.js';
import type { FiscalAttestSettings } from '../settings.js';
import { belcotaxDate, buildBelcotaxXml, splitPayerName, toCents } from './xml.js';

const SETTINGS: FiscalAttestSettings = {
  companyNumber: '0123456749',
  legalName: 'Sportkampen & Co vzw',
  address: 'Sportlaan 1',
  postcode: '9000',
  city: 'Gent',
  authorityType: 'municipality',
  authorityName: 'Stad Gent',
  authorityReference: '',
  authorityCompanyNumber: '0207451227',
  authorityAddress: 'Botermarkt 1',
  authorityPostcode: '9000',
  authorityCity: 'Gent',
  signatoryName: 'Jan Janssens',
  signatoryFunction: 'Voorzitter',
  senderContactName: 'Jan Janssens',
  senderContactEmail: 'info@example.org',
  senderContactPhone: '09 123 45 67',
  maxDailyRates: []
};

function period(n: number, amount = 100) {
  const day = String(n).padStart(2, '0');
  return {
    registrationId: n,
    label: `Week ${n}`,
    productName: 'Omnisport',
    startDate: `2026-07-${day}`,
    endDate: `2026-07-${day}`,
    days: 1,
    amount,
    dailyRate: amount
  };
}

function attest(periodCount: number): AttestDraft {
  const periods = Array.from({ length: periodCount }, (_, i) => period(periodCount - i)); // unsorted
  return {
    key: '10:c7',
    incomeYear: 2026,
    child: { participantId: 10, firstName: 'Lotte', lastName: 'Peeters', birthDate: '2016-05-01', nationalNumber: '16050100178' },
    payer: {
      customerId: 7,
      fullName: 'An Peeters',
      nationalNumber: '85073003328',
      address: { street: 'Kerkstraat 1', postcode: '9000', city: 'Gent', country: 'BE' },
      sharePercent: 100,
      editUrl: '/admin/customers/x'
    },
    periods,
    totalAmount: periodCount * 100,
    totalDays: periodCount
  };
}

const zone = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1];
const zones = (xml: string, name: string) => [...xml.matchAll(new RegExp(`<${name}>([^<]*)</${name}>`, 'g'))].map((m) => m[1]);

describe('fiches', () => {
  it('splits more than 4 periods over fiches, sorted by date', () => {
    const chunks = chunkAttest(attest(6));
    assert.equal(chunks.length, 2);
    assert.deepEqual(chunks.map((c) => c.key), ['10:c7#1', '10:c7#2']);
    assert.deepEqual(chunks[0].periods.map((p) => p.registrationId), [1, 2, 3, 4]);
    assert.equal(chunks[0].totalAmount, 400);
    assert.equal(chunks[1].totalAmount, 200);
    assert.equal(chunks[1].totalDays, 2);
  });

  it('snapshots the settings and drops the admin edit url', () => {
    const data = toFicheData(chunkAttest(attest(1))[0], SETTINGS, 5, 'original');
    assert.equal(data.sequenceNumber, 5);
    assert.equal(data.authority.companyNumber, '0207451227');
    assert.equal('editUrl' in data.payer, false);
  });

  it('fingerprint ignores signatory changes but not amounts', () => {
    const a = toFicheData(chunkAttest(attest(2))[0], SETTINGS, 1, 'original');
    const b = toFicheData(chunkAttest(attest(2))[0], { ...SETTINGS, signatoryName: 'Other' }, 1, 'original');
    assert.equal(ficheFingerprint(a), ficheFingerprint(b));
    const c = { ...a, periods: [{ ...a.periods[0], amount: 99 }, a.periods[1]] };
    assert.notEqual(ficheFingerprint(a), ficheFingerprint(c));
  });
});

describe('belcotax xml', () => {
  it('formats dates and cents', () => {
    assert.equal(belcotaxDate('2026-07-06'), '06-07-2026');
    assert.equal(toCents(150.1), 15010);
  });

  it('splits the payer name using the child last name', () => {
    assert.deepEqual(splitPayerName('An Peeters', 'Peeters'), { lastName: 'Peeters', firstNames: 'An' });
    assert.deepEqual(splitPayerName('Van den Broeck Marie', 'Van den Broeck'), {
      lastName: 'Van den Broeck',
      firstNames: 'Marie'
    });
    assert.deepEqual(splitPayerName('Jan Van den Broeck', 'Peeters'), { lastName: 'Van den Broeck', firstNames: 'Jan' });
  });

  it('writes fiches with periods, control totals and escaping', () => {
    const fiches: FicheData[] = chunkAttest(attest(5)).map((c, i) => toFicheData(c, SETTINGS, i + 1, 'original'));
    const xml = buildBelcotaxXml({
      incomeYear: 2026,
      environment: 'test',
      sendType: 'original',
      sender: {
        companyNumber: '0123.456.749',
        legalName: SETTINGS.legalName,
        address: SETTINGS.address,
        postcode: SETTINGS.postcode,
        city: SETTINGS.city,
        contactName: 'Jan',
        contactEmail: 'info@example.org',
        contactPhone: '09 123 45 67'
      },
      fiches,
      createdAt: new Date(2027, 0, 15)
    });
    assert.equal(zone(xml, 'v0010_bestandtype'), 'BELCOTST');
    assert.equal(zone(xml, 'v0011_aanmaakdatum'), '15-01-2027');
    assert.equal(zone(xml, 'v0024_nationaalnr'), '0123456749');
    assert.equal(zone(xml, 'v0014_naam'), 'Sportkampen &amp; Co vzw');
    assert.equal(zones(xml, 'f2009_volgnummer').join(','), '1,2');
    assert.deepEqual(zones(xml, 'f86_2064_totalamount'), ['40000', '10000']);
    assert.deepEqual(zones(xml, 'f86_2059_totaalcontrole'), ['80000', '20000']);
    assert.deepEqual(zones(xml, 'f86_2063_amount4'), ['10000', '']);
    assert.equal(zones(xml, 'f86_2055_begindate1')[0], '01-07-2026');
    assert.equal(zones(xml, 'f86_2111_dailytariff1')[0], '10000');
    assert.equal(zone(xml, 'f2013_naam'), 'Peeters');
    assert.equal(zone(xml, 'f2114_voornamen'), 'An');
    assert.equal(zone(xml, 'f86_2031_certificationautorisation'), '2');
    assert.equal(zone(xml, 'f86_2109_certifiercbenumber'), '0207451227');
    assert.equal(zone(xml, 'r8010_aantalrecords'), '4');
    assert.equal(zone(xml, 'r8011_controletotaal'), '3');
    assert.equal(zone(xml, 'r8012_controletotaal'), '100000');
    assert.equal(zone(xml, 'r9011_totaalaantalrecords'), '6');
    assert.equal(zone(xml, 'r9013_controletotaal'), '100000');
    assert.equal(zone(xml, 'v0025_typeenvoi'), '0');
  });

  it('marks corrections in the file and per fiche', () => {
    const data = toFicheData(chunkAttest(attest(1))[0], SETTINGS, 7, 'cancellation');
    const xml = buildBelcotaxXml({
      incomeYear: 2026,
      environment: 'production',
      sendType: 'correction',
      sender: { ...SETTINGS, contactName: '', contactEmail: '', contactPhone: '' },
      fiches: [data]
    });
    assert.equal(zone(xml, 'v0010_bestandtype'), 'BELCOTAX');
    assert.equal(zone(xml, 'v0025_typeenvoi'), '1');
    assert.equal(zone(xml, 'f2028_typetraitement'), '3');
    assert.equal(zone(xml, 'r8011_controletotaal'), '7');
  });
});
