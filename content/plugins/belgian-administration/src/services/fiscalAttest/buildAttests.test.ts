// Unit tests for buildAttests + carePeriod (no database). Run with
// `npm test -w content/plugins/belgian-administration` (node:test on dist/).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ageOn, resolveCarePeriod, weekdaysBetween } from '../../lib/carePeriod.js';
import { buildAttests, splitAmount, type CandidateRegistration, type PayerShare } from './buildAttests.js';

const MOM: PayerShare = {
  customerId: 7,
  fullName: 'An Peeters',
  nationalNumber: '85073003328',
  address: { street: 'Kerkstraat 1', postcode: '9000', city: 'Gent', country: 'BE' },
  sharePercent: 100
};

function candidate(overrides: Partial<CandidateRegistration> = {}): CandidateRegistration {
  return {
    registrationId: 1,
    participantId: 10,
    firstName: 'Lotte',
    lastName: 'Peeters',
    birthDate: '2016-05-01',
    nationalNumber: '16050100178',
    nationalNumberNotApplicable: false,
    productId: 100,
    productName: 'Omnisport',
    variantTitle: 'Week 1 zomer 2026',
    suggestedPrice: 150,
    periodOptions: [
      { sourceRank: 1, optionText: 'Week 1 zomer 2026', startDate: '2026-07-06', endDate: '2026-07-10', dayCount: null }
    ],
    order: { orderId: 1, orderNumber: '1001', paymentStatus: 'paid', amount: 150 },
    overrideAmount: null,
    payers: [],
    defaultPayer: MOM,
    ...overrides
  };
}

const codes = (issues: { code: string }[]) => issues.map((i) => i.code).sort();

describe('carePeriod', () => {
  it('counts weekdays inclusive', () => {
    assert.equal(weekdaysBetween('2026-07-06', '2026-07-10'), 5); // Mon-Fri
    assert.equal(weekdaysBetween('2026-07-06', '2026-07-12'), 5); // incl. weekend
    assert.equal(weekdaysBetween('2026-07-10', '2026-07-06'), 0);
  });

  it('prefers the variant option over the product option', () => {
    const result = resolveCarePeriod([
      { sourceRank: 2, optionText: 'Zomer', startDate: '2026-07-01', endDate: '2026-08-31', dayCount: null },
      { sourceRank: 1, optionText: 'Week 1', startDate: '2026-07-06', endDate: '2026-07-10', dayCount: 4 }
    ]);
    assert.ok(result.ok);
    assert.equal(result.ok && result.period.label, 'Week 1');
    assert.equal(result.ok && result.period.days, 4);
    assert.equal(result.ok && result.period.daysDerived, false);
  });

  it('reports missing, partial and ambiguous dates', () => {
    assert.deepEqual(resolveCarePeriod([]), { ok: false, reason: 'no_dates' });
    assert.deepEqual(
      resolveCarePeriod([{ sourceRank: 1, optionText: 'W', startDate: '2026-07-06', endDate: null, dayCount: null }]),
      { ok: false, reason: 'no_end_date' }
    );
    assert.deepEqual(
      resolveCarePeriod([
        { sourceRank: 1, optionText: 'A', startDate: '2026-07-06', endDate: '2026-07-10', dayCount: null },
        { sourceRank: 1, optionText: 'B', startDate: '2026-07-13', endDate: '2026-07-17', dayCount: null }
      ]),
      { ok: false, reason: 'ambiguous' }
    );
  });

  it('computes the age on a date', () => {
    assert.equal(ageOn('2012-07-07', '2026-07-06'), 13); // birthday the day after
    assert.equal(ageOn('2012-07-06', '2026-07-06'), 14);
  });
});

describe('splitAmount', () => {
  it('gives the rounding difference to the first payer', () => {
    const parts = splitAmount(100, [
      { ...MOM, sharePercent: 33.33 },
      { ...MOM, customerId: null, sharePercent: 66.67 }
    ]);
    assert.equal(parts.reduce((a, b) => a + b, 0), 100);
    assert.deepEqual(parts, [33.33, 66.67]);
    const thirds = splitAmount(10, [
      { ...MOM, sharePercent: 50 },
      { ...MOM, customerId: null, sharePercent: 50 }
    ]);
    assert.deepEqual(thirds, [5, 5]);
  });
});

describe('buildAttests', () => {
  it('makes one attest per child per payer with the order amount', () => {
    const result = buildAttests(2026, [candidate()], { maxDailyRate: null });
    assert.equal(result.attests.length, 1);
    const [attest] = result.attests;
    assert.equal(attest.totalAmount, 150);
    assert.equal(attest.totalDays, 5);
    assert.equal(attest.periods[0].dailyRate, 30);
    assert.deepEqual(codes(result.issues), ['days_derived']);
  });

  it('groups two camps of the same child and payer on one attest', () => {
    const result = buildAttests(
      2026,
      [
        candidate(),
        candidate({
          registrationId: 2,
          periodOptions: [
            { sourceRank: 1, optionText: 'Week 2 zomer 2026', startDate: '2026-07-13', endDate: '2026-07-17', dayCount: 5 }
          ],
          order: { orderId: 2, orderNumber: '1002', paymentStatus: 'paid', amount: 120 }
        })
      ],
      { maxDailyRate: null }
    );
    assert.equal(result.attests.length, 1);
    assert.equal(result.attests[0].periods.length, 2);
    assert.equal(result.attests[0].totalAmount, 270);
    assert.equal(result.attests[0].totalDays, 10);
  });

  it('uses the manual amount before the order line', () => {
    const result = buildAttests(2026, [candidate({ overrideAmount: 99.5 })], { maxDailyRate: null });
    assert.equal(result.attests[0].totalAmount, 99.5);
    assert.ok(codes(result.issues).includes('amount_override'));
  });

  it('blocks a registration without amount, dates or birth date, and a child of 14', () => {
    const noAmount = buildAttests(2026, [candidate({ order: null })], { maxDailyRate: null });
    assert.equal(noAmount.attests.length, 0);
    assert.ok(codes(noAmount.issues).includes('no_amount'));

    const noDates = buildAttests(2026, [candidate({ periodOptions: [] })], { maxDailyRate: null });
    assert.ok(codes(noDates.issues).includes('no_dates'));

    const noBirth = buildAttests(2026, [candidate({ birthDate: null })], { maxDailyRate: null });
    assert.ok(codes(noBirth.issues).includes('no_birth_date'));

    const tooOld = buildAttests(2026, [candidate({ birthDate: '2012-07-06' })], { maxDailyRate: null });
    assert.ok(codes(tooOld.issues).includes('too_old'));
    assert.equal(tooOld.attests.length, 0);
  });

  it('blocks a child turning 14 during the camp until the amount is entered by hand', () => {
    const turns = buildAttests(2026, [candidate({ birthDate: '2012-07-08' })], { maxDailyRate: null });
    assert.ok(codes(turns.issues).includes('turns_14_during'));
    assert.equal(turns.issues.find((i) => i.code === 'turns_14_during')?.severity, 'blocking');
    assert.equal(turns.attests.length, 0);

    const fixed = buildAttests(2026, [candidate({ birthDate: '2012-07-08', overrideAmount: 60 })], {
      maxDailyRate: null
    });
    assert.equal(fixed.issues.find((i) => i.code === 'turns_14_during')?.severity, 'warning');
    assert.equal(fixed.attests[0].totalAmount, 60);
  });

  it('leaves out unpaid orders without a manual amount', () => {
    const result = buildAttests(
      2026,
      [candidate({ order: { orderId: 1, orderNumber: '1001', paymentStatus: 'pending', amount: 150 } })],
      { maxDailyRate: null }
    );
    assert.equal(result.attests.length, 0);
    assert.deepEqual(codes(result.issues), ['unpaid']);
  });

  it('splits between parents', () => {
    const dad: PayerShare = {
      customerId: null,
      fullName: 'Tom Janssens',
      nationalNumber: '84090712339',
      address: { street: 'Dorp 2', postcode: '9000', city: 'Gent', country: 'BE' },
      sharePercent: 40
    };
    const result = buildAttests(
      2026,
      [candidate({ payers: [{ ...MOM, sharePercent: 60 }, dad] })],
      { maxDailyRate: null }
    );
    assert.equal(result.attests.length, 2);
    const amounts = result.attests.map((a) => a.totalAmount).sort((a, b) => a - b);
    assert.deepEqual(amounts, [60, 90]);
  });

  it('blocks shares that do not add up to 100%', () => {
    const result = buildAttests(
      2026,
      [candidate({ payers: [{ ...MOM, sharePercent: 60 }, { ...MOM, customerId: null, fullName: 'X', sharePercent: 30 }] })],
      { maxDailyRate: null }
    );
    assert.ok(codes(result.issues).includes('shares_not_100'));
    assert.equal(result.attests.length, 0);
  });

  it('leaves out excluded orders without checks', () => {
    const result = buildAttests(
      2026,
      [
        candidate({
          birthDate: null,
          excluded: { reason: 'organisation', reasonLabel: 'Organisation', note: null, scope: 'order' }
        })
      ],
      { maxDailyRate: null }
    );
    assert.equal(result.attests.length, 0);
    assert.equal(result.issues.length, 0);
    assert.equal(result.registrations[0].excluded?.reason, 'organisation');
  });

  it('flags a daily rate above the ceiling as information only', () => {
    const result = buildAttests(2026, [candidate()], { maxDailyRate: 16.9 });
    assert.ok(codes(result.issues).includes('above_ceiling'));
    assert.equal(result.attests.length, 1);
  });
});
