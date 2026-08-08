import axios, { AxiosInstance } from 'axios';
import type {
  WooCommerceSettings,
  WooCommerceProduct,
  WooCommerceProductVariation,
  WooCommerceOrder
} from '../types.js';
import { debug } from '../core.js';

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

export async function* fetchProductVariations(
  client: AxiosInstance,
  productId: number,
  perPage = 50
): AsyncGenerator<WooCommerceProductVariation[]> {
  let page = 1;
  for (;;) {
    const { data } = await client.get<WooCommerceProductVariation[]>(
      `/products/${productId}/variations`,
      { params: { page, per_page: perPage } }
    );
    debug(JSON.stringify(data));
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

// WooCommerce's /orders endpoint defaults to status=any, which already
// excludes 'trash'ed orders - no explicit status filter needed here.
export async function* fetchAllOrders(
  client: AxiosInstance,
  perPage = 50
): AsyncGenerator<WooCommerceOrder[]> {
  let page = 1;
  for (;;) {
    const { data } = await client.get<WooCommerceOrder[]>('/orders', {
      params: { page, per_page: perPage, orderby: 'id', order: 'asc' }
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
