import axios, { AxiosInstance } from 'axios';
import type { WooCommerceSettings, WooCommerceProduct } from '../types.js';

export function createWooCommerceClient(settings: WooCommerceSettings): AxiosInstance {
  if (!settings.storeUrl) {
    throw new Error('WooCommerce store URL is not configured.');
  }
  if (!settings.storeUrl.startsWith('https://')) {
    // consumer_key/consumer_secret travel as query params (WooCommerce REST API
    // convention) - refuse to send them anywhere but an HTTPS endpoint.
    throw new Error(
      'WooCommerce store URL must use HTTPS so API credentials are not sent in the clear.'
    );
  }
  return axios.create({
    baseURL: `${settings.storeUrl.replace(/\/+$/, '')}/wp-json/wc/v3`,
    params: {
      consumer_key: settings.consumerKey,
      consumer_secret: settings.consumerSecret
    }
  });
}

export async function* fetchAllProducts(
  client: AxiosInstance,
  perPage = 50
): AsyncGenerator<WooCommerceProduct[]> {
  let page = 1;
  for (;;) {
    const { data } = await client.get<WooCommerceProduct[]>('/products', {
      params: { page, per_page: perPage }
    });
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }
    yield data;
    if (data.length < perPage) {
      return;
    }
    page += 1;
  }
}
