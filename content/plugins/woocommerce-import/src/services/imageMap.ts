import { insert, select } from '@evershop/postgres-query-builder';
import { pool } from '../core.js';

export async function findLocalImageUrl(externalImageSrc: string): Promise<string | null> {
  const row = await select('local_url')
    .from('woocommerce_image_map')
    .where('external_image_src', '=', externalImageSrc)
    .load(pool);
  return row ? row.local_url : null;
}

export async function saveImageMap(externalImageSrc: string, localUrl: string): Promise<void> {
  await insert('woocommerce_image_map')
    .given({ external_image_src: externalImageSrc, local_url: localUrl })
    .execute(pool);
}
