import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// The Camp settings switch for member prices (#210): off by default, and while
// off a membership number sent with a registration is not kept.

const settings: Record<string, unknown> = {};
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (name: string, defaultValue: unknown) =>
    name in settings ? settings[name] : defaultValue,
  refreshSetting: async () => {}
}));

const { isSwitchOn, memberPricesEnabled } = await import('../../services/memberPricesSetting.js');
const { collectParticipantExtraData } = await import('../../services/participantCheckoutFields.js');

beforeEach(() => {
  for (const key of Object.keys(settings)) {
    delete settings[key];
  }
});

describe('isSwitchOn', () => {
  it('is on for 1, "1", true and "true"', () => {
    expect(isSwitchOn(1)).toBe(true);
    expect(isSwitchOn('1')).toBe(true);
    expect(isSwitchOn(true)).toBe(true);
    expect(isSwitchOn('true')).toBe(true);
  });

  it('is off for anything else', () => {
    expect(isSwitchOn(0)).toBe(false);
    expect(isSwitchOn('0')).toBe(false);
    expect(isSwitchOn(false)).toBe(false);
    expect(isSwitchOn(null)).toBe(false);
    expect(isSwitchOn(undefined)).toBe(false);
  });
});

describe('memberPricesEnabled', () => {
  it('is off when the setting was never saved', async () => {
    expect(await memberPricesEnabled()).toBe(false);
  });

  it('follows the saved setting', async () => {
    settings.memberPricesEnabled = '1';
    expect(await memberPricesEnabled()).toBe(true);
    settings.memberPricesEnabled = '0';
    expect(await memberPricesEnabled()).toBe(false);
  });
});

describe('collectParticipantExtraData and the membership number', () => {
  it('keeps the membership number while member prices are on', async () => {
    settings.memberPricesEnabled = '1';
    expect(await collectParticipantExtraData({ membership_number: ' WWSV-12 ' })).toEqual({
      membership_number: 'WWSV-12'
    });
  });

  it('drops the membership number while member prices are off', async () => {
    settings.memberPricesEnabled = '0';
    expect(await collectParticipantExtraData({ membership_number: 'WWSV-12' })).toBeUndefined();
  });
});
