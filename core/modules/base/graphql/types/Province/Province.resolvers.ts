import { provinces, type Province } from '../../../../../lib/locale/provinces.js';

export default {
  Query: {
    provinces: (
      _: unknown,
      { countries = [] }: { countries?: string[] }
    ) => {
      if (countries.length === 0) {
        return provinces;
      }

      return provinces.filter((p) =>
        countries.includes(p.countryCode)
      );
    }
  },

  Province: {
    name: (province: Province | string) => {
      if (typeof province !== 'string' && province.name) {
        return province.name;
      }

      const p = provinces.find(
        (pr) =>
          pr.code === (typeof province === 'string' ? province : province.code)
      );

      return p?.name || 'INVALID_PROVINCE';
    },

    countryCode: (province: Province | string) => {
      if (typeof province !== 'string' && province.countryCode) {
        return province.countryCode;
      }

      const p = provinces.find(
        (pr) =>
          pr.code === (typeof province === 'string' ? province : province.code)
      );

      return p?.countryCode || 'INVALID_PROVINCE';
    },

    code: (province: Province | string) => {
      if (typeof province !== 'string' && province.code) {
        return province.code;
      }

      return typeof province === 'string'
        ? province
        : 'INVALID_PROVINCE';
    }
  }
};