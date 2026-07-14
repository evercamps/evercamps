import { getSetting } from '../core.js';
import type { WooCommerceSettings } from '../types.js';

export async function getWooCommerceSettings(): Promise<WooCommerceSettings> {
  const [storeUrl, consumerKey, consumerSecret] = await Promise.all([
    getSetting('wooCommerceStoreUrl', ''),
    getSetting('wooCommerceConsumerKey', ''),
    getSetting('wooCommerceConsumerSecret', '')
  ]);
  return {
    storeUrl: storeUrl as string,
    consumerKey: consumerKey as string,
    consumerSecret: consumerSecret as string
  };
}
