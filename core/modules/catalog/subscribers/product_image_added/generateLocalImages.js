import { error, debug } from '../../../../lib/log/logger.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { existsSync } from 'fs';
import path from 'path';
import { update } from '@evershop/postgres-query-builder';
import { CONSTANTS } from '../../../../lib/helpers.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { Jimp } from 'jimp';

export default async function generateLocalImages(data) {
  if (getConfig('system.file_storage') === 'local') {
    try {
      const imagePath = data.origin_image.replace('/assets', '');
      const mediaPath = path.join(CONSTANTS.MEDIAPATH, imagePath);
      const ext = path.extname(path.resolve(CONSTANTS.MEDIAPATH, imagePath));
      const singlePath = imagePath.replace(ext, `-single${ext}`);
      const listingPath = imagePath.replace(ext, `-listing${ext}`);
      const thumbnailPath = imagePath.replace(ext, `-thumb${ext}`);
      if (existsSync(mediaPath)) {
        // Generate thumbnail
        await generateImage(mediaPath, thumbnailPath,
          getConfig('catalog.product.image.thumbnail.width', 100),
          getConfig('catalog.product.image.thumbnail.height', 100)
        );

        // Generate listing
        await generateImage(mediaPath, listingPath,
          getConfig('catalog.product.image.listing.width', 250),
          getConfig('catalog.product.image.listing.height', 250)
        );

        // Generate single
        await generateImage(mediaPath, singlePath,
          getConfig('catalog.product.image.single.width', 500),
          getConfig('catalog.product.image.single.height', 500)
        );
      }

      // Update the record in the database with the new URLs in the variant columns
      const connection = await getConnection();
      await update('product_image')
        .given({
          single_image: `/assets${singlePath}`,
          listing_image: `/assets${listingPath}`,
          thumb_image: `/assets${thumbnailPath}`
        })
        .where('product_image_product_id', '=', data.product_image_product_id)
        .and('origin_image', '=', data.origin_image)
        .execute(connection);
    } catch (e) {
      error(e);
    }
  }
}

async function generateImage(mediaPath, imagePath, maxWidth, maxHeight) {
  const image = await Jimp.read(mediaPath);
  const { width, height } = image.bitmap;

  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;

  const scale = Math.min(widthRatio, heightRatio);

  await image.resize({
    w: Math.floor(width * scale),
    h: Math.floor(height * scale)
  });
  await image.write(path.join(CONSTANTS.MEDIAPATH, imagePath));
}
