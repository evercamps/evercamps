import { select } from '@evershop/postgres-query-builder';
import { countries, Country } from '../../../../../lib/locale/countries.js';
import { Province, provinces } from '../../../../../lib/locale/provinces.js';
import { pool } from '../../../../../lib/postgres/connection.js';

export default {
  Query: {
    countries: (
      _: unknown,
      { countries: countryCodes = [] }: { countries?: string[] }
    ) => {
      if (countryCodes.length === 0) {
        return countries;
      }

      return countries.filter((c: Country) =>
        countryCodes.includes(c.code)
      );
    },

    allowedCountries: async () => {
      const allowedCountries = await select('country')
        .from('shipping_zone')
        .execute(pool);

      return countries.filter((c: Country) =>
        allowedCountries.some((p: { country: string }) =>
          p.country === c.code
        )
      );
    }
  },

  Country: {
    name: (country: Country | string) => {
      if (typeof country !== 'string' && country.name) {
        return country.name;
      }

      const c = countries.find(
        (p: Country) =>
          p.code === (typeof country === 'string' ? country : country.code)
      );

      return c?.name;
    },

    code: (country: Country | string) => {
      if (typeof country !== 'string' && country.code) {
        return country.code;
      }

      return country;
    },

    provinces: (country: Country) =>
      provinces.filter(
        (p: Province) => p.countryCode === country.code
      )
  }
};
