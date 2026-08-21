import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import { OK } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

interface Variant {
  variant_product_id: number;
  product_id: number;
  sku: string;
  name: string;
  status: number;
  price: number;
  qty: number;
  image?: string | null;
  origin_image?: string | null;
  gallery?: string | null;
  images: {
    url: string | null;
    path?: string | null;
  }[];
  attributes?: unknown[];
}

export default async function getVariants(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  const query = select()
    .select('product_id', 'variant_product_id')
    .select('sku')
    .select('name')
    .select('status')
    .select('price')
    .select('qty')
    .select('product.image')
    .select('product_image.origin_image', 'gallery')
    .from('product');

  query
    .leftJoin('product_image')
    .on('product.product_id', '=', 'product_image.product_image_product_id');

  query
    .leftJoin('product_description')
    .on(
      'product.product_id',
      '=',
      'product_description.product_description_product_id'
    );

  // Only return items that are not assigned to any group
  query.where('variant_group_id', 'IS', null);

  if (request.query.keyword) {
    query
      .andWhere('name', 'LIKE', `%${request.query.keyword}%`)
      .or('sku', 'LIKE', `%${request.query.keyword}%`);
  }

  const results = (await query.execute(pool)) as Variant[];

  const variants: Variant[] = [];

  results.forEach((variant) => {
    const index = variants.findIndex(
      (v) => v.variant_product_id === variant.variant_product_id
    );

    if (index === -1) {
      variants.push({
        ...variant,
        image: {
          url: variant.origin_image
        } as unknown as string,
        images: [
          variant.image
            ? {
                url: variant.image,
                path: variant.image
              }
            : null,
          variant.gallery
            ? {
                url: variant.gallery,
                path: variant.gallery
              }
            : null
        ].filter((i) => i !== null)
      });
    } else {
      variants[index] = {
        ...variants[index],
        images: variants[index].images.concat({
          url: variant.gallery ?? null,
          path: variant.gallery ?? null
        })
      };
    }
  });

  for (let i = 0; i < variants.length; i += 1) {
    variants[i].attributes = JSON.parse(
      JSON.stringify(
        await select()
          .from('product_attribute_value_index')
          .where('product_id', '=', variants[i].variant_product_id)
          .execute(pool)
      )
    );
  }

  response.status(OK).json({
    data: {
      variants
    }
  });
}