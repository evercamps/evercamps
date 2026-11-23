import { describe, expect, it } from '@jest/globals';
import { isMemberLine, linePrice, membershipNumberOf } from '../../services/membership.js';

describe('membershipNumberOf', () => {
  it('reads the number from extra data given as a JSON string or an object', () => {
    expect(membershipNumberOf('{"membership_number":"WWSV-12"}')).toBe('WWSV-12');
    expect(membershipNumberOf({ membership_number: ' 345 ' })).toBe('345');
  });

  it('is null for missing, empty or unreadable extra data', () => {
    expect(membershipNumberOf(null)).toBeNull();
    expect(membershipNumberOf(undefined)).toBeNull();
    expect(membershipNumberOf('{"birth_date":"2015-01-01"}')).toBeNull();
    expect(membershipNumberOf({ membership_number: '   ' })).toBeNull();
    expect(membershipNumberOf('not json')).toBeNull();
  });
});

describe('isMemberLine', () => {
  it('is true when every registration has a membership number', () => {
    expect(isMemberLine([{ extraData: '{"membership_number":"1"}' }])).toBe(true);
    expect(
      isMemberLine([{ extraData: { membership_number: '1' } }, { extraData: { membership_number: '2' } }])
    ).toBe(true);
  });

  it('is false without registrations, or when one registration has no number', () => {
    expect(isMemberLine([])).toBe(false);
    expect(isMemberLine(null)).toBe(false);
    expect(isMemberLine([{ extraData: { membership_number: '1' } }, { extraData: null }])).toBe(false);
  });
});

describe('linePrice', () => {
  const member = [{ extraData: { membership_number: '1' } }];
  const nonMember = [{ extraData: null }];

  it('uses the member price for a member line when the variant has one', () => {
    expect(linePrice('230.0000', '210.0000', member)).toBe(210);
  });

  it('uses the normal price for a non-member line', () => {
    expect(linePrice('230.0000', '210.0000', nonMember)).toBe(230);
  });

  it('uses the normal price when the variant has no member price', () => {
    expect(linePrice(230, null, member)).toBe(230);
    expect(linePrice(230, undefined, member)).toBe(230);
    expect(linePrice(230, '', member)).toBe(230);
  });

  it('allows a member price of 0', () => {
    expect(linePrice(230, 0, member)).toBe(0);
  });
});
