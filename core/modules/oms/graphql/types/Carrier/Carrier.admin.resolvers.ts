import { getConfig } from '../../../../../lib/util/getConfig.js';

interface Carrier {
  [key: string]: unknown;
}

interface CarrierWithCode extends Carrier {
  code: string;
}

export default {
  Query: {
    carriers: (): CarrierWithCode[] => {
      const carriers = getConfig('oms.carriers', {}) as Record<
        string,
        Carrier
      >;

      return Object.keys(carriers).map((key) => ({
        ...carriers[key],
        code: key
      }));
    }
  }
};