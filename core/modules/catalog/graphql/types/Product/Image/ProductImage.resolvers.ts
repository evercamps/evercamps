import { select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import type { Pool } from 'pg';

interface Product {
  productId: number;
  originImage?: string | null;
  thumbImage?: string | null;
  singleImage?: string | null;
  listingImage?: string | null;
  name?: string;
}

interface Context {
  pool: Pool;
}

interface ProductImage {
  product_image_id: number;
  origin_image: string;
  thumb_image?: string | null;
  single_image?: string | null;
  listing_image?: string | null;
}

export default {
  Product: {
    image: async (product: Product) => {
      const mainImage = product.originImage;

      return mainImage
        ? {
            thumb: product.thumbImage || null,
            single: product.singleImage || null,
            listing: product.listingImage || null,
            alt: product.name,
            url: mainImage,
            uuid: uuidv4(),
            origin: mainImage
          }
        : null;
    },

    gallery: async (
      product: Product,
      _: unknown,
      { pool }: Context
    ) => {
      const gallery = (await select()
        .from('product_image')
        .where(
          'product_image_product_id',
          '=',
          product.productId
        )
        .and('is_main', '=', false)
        .execute(pool)) as ProductImage[];

      return gallery.map((image) => ({
        id: image.product_image_id,
        alt: product.name,
        url: image.origin_image,
        uuid: uuidv4(),
        origin: image.origin_image,
        thumb: image.thumb_image,
        single: image.single_image,
        listing: image.listing_image
      }));
    }
  }
};