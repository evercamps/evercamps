import { getSetting } from '../../setting/services/setting.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { debug } from '../../../lib/log/logger.js';
import { MollieConfig } from '../types/mollieConfig';

export async function getMollieApiKey(): Promise<string | null> {
  const mollieConfig = getConfig<MollieConfig>('system.mollie', {});

  let apiKey: string | null;

  if (mollieConfig.mollieLiveApiKey || mollieConfig.mollieTestApiKey) {
    apiKey = mollieConfig.molliePaymentMode
      ? (mollieConfig.mollieLiveApiKey ?? null)
      : (mollieConfig.mollieTestApiKey ?? null);
  } else {
    const mollieLiveApiKey = await getSetting<string | null>('mollieLiveApiKey', null);
    const mollieTestApiKey = await getSetting<string | null>('mollieTestApiKey', null);
    const molliePaymentMode = await getSetting<number>('molliePaymentMode', 0);
    debug(`Mollie config ${mollieLiveApiKey}, ${mollieTestApiKey}, ${molliePaymentMode}`);

    apiKey = parseInt(String(molliePaymentMode), 10) === 1 ? mollieLiveApiKey : mollieTestApiKey;
  }
  debug(`api key is ${apiKey}`);
  return apiKey;
}
