import { getSetting } from '../../setting/services/setting.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { debug } from '../../../lib/log/logger.js';

export async function getMollieApiKey() {
    const mollieConfig = getConfig('system.mollie', {});

    let apiKey;

    if (mollieConfig.mollieLiveApiKey || mollieConfig.mollieTestApiKey) {
        apiKey = mollieConfig.molliePaymentMode ? mollieConfig.mollieLiveApiKey : mollieConfig.mollieTestApiKey;
    } 
    else {
        const mollieLiveApiKey = await getSetting('mollieLiveApiKey', null);
        const mollieTestApiKey = await getSetting('mollieTestApiKey', null);
        const molliePaymentMode = await getSetting('molliePaymentMode', 0);
        debug(`Mollie config ${mollieLiveApiKey}, ${mollieTestApiKey}, ${molliePaymentMode}`);

        apiKey = parseInt(molliePaymentMode, 10) === 1 ? mollieLiveApiKey : mollieTestApiKey;
    }
    debug(`api key is ${apiKey}`);
    return apiKey;
}