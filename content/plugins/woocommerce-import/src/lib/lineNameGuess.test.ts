// Unit tests for guessing the variant of a WooCommerce order line name (no database).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  datesFromLineName,
  optionTextFromLineName,
  suggestVariant,
  yearOfLineName,
  type GuessableVariant
} from './lineNameGuess.js';

const variants: GuessableVariant[] = [
  { variantId: 1, title: 'Week 1 zomer 2022', options: 'Week 1 zomer 2022 (2022-07-04)' },
  { variantId: 2, title: 'Week 10 zomer 2022', options: 'Week 10 zomer 2022' },
  { variantId: 3, title: 'Week 1 zomer 2023', options: 'Week 1 zomer 2023' },
  { variantId: 4, title: 'Week 2 zomer 2022', options: 'Week 2 zomer 2022' }
];

describe('yearOfLineName', () => {
  it('takes the last year in the name', () => {
    assert.equal(yearOfLineName('Kamp X 2022 - Week 1 zomer'), 2022);
    assert.equal(yearOfLineName('Kamp X - Week 1'), null);
  });
});

describe('suggestVariant', () => {
  it('matches week and year', () => {
    assert.equal(suggestVariant('Kamp X 2022 - Week 1 zomer', variants), 1);
    assert.equal(suggestVariant('Kamp X 2023 - Week 1 zomer', variants), 3);
    assert.equal(suggestVariant('Kamp X 2022 - week 2', variants), 4);
  });

  it('does not confuse week 1 with week 10', () => {
    assert.equal(suggestVariant('Kamp X 2022 - Week 10 zomer', variants), 2);
  });

  it('gives no suggestion when it is ambiguous', () => {
    // no year: week 1 of 2022 and 2023 match equally
    assert.equal(suggestVariant('Kamp X - Week 1 zomer', variants), null);
    assert.equal(suggestVariant('Kamp X 2022', variants), null);
  });

  it('gives no suggestion for an unknown week', () => {
    assert.equal(suggestVariant('Kamp X 2022 - Week 7 zomer', variants), null);
  });
});

describe('suggestVariant with real WooCommerce names', () => {
  const kleuter: GuessableVariant[] = [
    { variantId: 11, title: 'Zomer 1 2020', options: 'Zomer 1 2020 (2020-07-06)' },
    { variantId: 12, title: 'Zomer 2 2020', options: 'Zomer 2 2020' },
    { variantId: 13, title: 'Zomer 1 2021', options: 'Zomer 1 2021' }
  ];

  it('uses the season of the orders when the name has no year', () => {
    assert.equal(suggestVariant('Kleuterkamp - Zomer 1', kleuter, 2020), 11);
    assert.equal(suggestVariant('Kleuterkamp 2021 - Zomer 1', kleuter, 2020), 13);
  });

  it('ignores dates in the name', () => {
    assert.equal(suggestVariant('Kleuterkamp - Zomer 1: 06/07 - 10/07 - kermis', kleuter, 2020), 11);
  });
});

describe('new option from a line name', () => {
  it('builds the option text with the season', () => {
    assert.equal(optionTextFromLineName('Kleuterkamp 2021 - Zomer 1', 2021), 'Zomer 1 2021');
    assert.equal(optionTextFromLineName('Kleuterkamp - Zomer 1: 06/07 - 10/07 - kermis', 2020), 'Zomer 1 2020');
    assert.equal(optionTextFromLineName('Basketbalkamp Krokus - Krokus', null), 'Krokus');
  });

  it('reads the dates from the name', () => {
    assert.deepEqual(datesFromLineName('Kleuterkamp - Zomer 1: 06/07 - 10/07 - kermis', 2020), {
      startDate: '2020-07-06',
      endDate: '2020-07-10'
    });
    assert.deepEqual(datesFromLineName('Basketkamp 28/12/20 tot en met 30/12/20', null), {
      startDate: '2020-12-28',
      endDate: '2020-12-30'
    });
    assert.deepEqual(datesFromLineName('Kamp 30/12 - 02/01', 2020), {
      startDate: '2020-12-30',
      endDate: '2021-01-02'
    });
    assert.equal(datesFromLineName('Kleuterkamp 2021 - Zomer 1', 2021), null);
  });
});

describe('suggestVariant and options without a year', () => {
  it('does not suggest a pre-season option for a known year', () => {
    const options: GuessableVariant[] = [
      { variantId: 1, title: 'Zomer 1', options: '' },
      { variantId: 2, title: 'Zomer 1 2021', options: '' }
    ];
    assert.equal(suggestVariant('Zomer 1 2020', options, 2020), null);
    assert.equal(suggestVariant('Zomer 1 2021', options, 2021), 2);
  });
});
