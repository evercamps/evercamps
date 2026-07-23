import { DateTime } from 'luxon';
import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  DateTime: {
    value: (dateTime: Date) => dateTime,

    timezone: async () => {
      const timeZone = getConfig('shop.timezone', 'UTC');
      return timeZone;
    },

    text: async (
      value: Date,
      { format = 'yyyy-LL-dd' }: { format?: string }
    ) => {
      if (!DateTime.fromJSDate(value).isValid) {
        return null;
      }

      const timeZone = getConfig('shop.timezone', 'UTC');
      const language = getConfig('shop.language', 'en');

      const date = DateTime.fromJSDate(value, { zone: timeZone })
        .setLocale(language)
        .setZone(timeZone)
        .toFormat(format);

      return date;
    }
  }
};