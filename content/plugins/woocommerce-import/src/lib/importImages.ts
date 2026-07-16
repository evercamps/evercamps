import axios from 'axios';
import { uploadFile } from '../core.js';
import { findLocalImageUrl, saveImageMap } from '../services/imageMap.js';
import type { WooCommerceProductImage } from '../types.js';

function fileNameFromUrl(url: string, index: number): string {
  const withoutQuery = url.split('?')[0];
  const base = withoutQuery.substring(withoutQuery.lastIndexOf('/') + 1) || 'image';
  const sanitized = base.replace(/[^a-zA-Z0-9.\-_]/g, '-').toLowerCase();
  const withExtension = /\.[a-z0-9]+$/i.test(sanitized) ? sanitized : `${sanitized}.jpg`;
  return `${index}-${withExtension}`;
}

async function downloadAndStore(
  externalProductId: number,
  index: number,
  src: string
): Promise<string> {
  const response = await axios.get(src, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);

  const uploaded = await uploadFile(
    [
      {
        buffer,
        mimetype: (response.headers['content-type'] as string) || 'image/jpeg',
        size: buffer.length,
        filename: fileNameFromUrl(src, index)
      }
    ],
    `catalog/wc-import/${externalProductId}`
  );

  return uploaded[0].url;
}

// Downloads every WooCommerce image into evercamps' own media storage and
// returns the local /assets URLs to use in ProductImportData.images instead
// of the external WooCommerce URLs. Already-downloaded images are looked up
// in woocommerce_image_map so re-running an import doesn't re-upload them.
export async function resolveProductImages(
  externalProductId: number,
  images: WooCommerceProductImage[]
): Promise<string[]> {
  const urls: string[] = [];
  for (let index = 0; index < images.length; index += 1) {
    const src = images[index]?.src;
    if (!src) {
      continue;
    }

    const existing = await findLocalImageUrl(src);
    if (existing) {
      urls.push(existing);
      continue;
    }

    const localUrl = await downloadAndStore(externalProductId, index, src);
    await saveImageMap(src, localUrl);
    urls.push(localUrl);
  }
  return urls;
}
