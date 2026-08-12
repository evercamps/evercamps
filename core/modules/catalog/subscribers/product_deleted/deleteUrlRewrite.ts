import { execute } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';

interface ProductData {
  uuid: string;
}

export default async function buildUrlReWrite(data: ProductData) {
  const productUuid = data.uuid;

  // Delete the url rewrite for the product
  await execute(
    pool,
    `DELETE FROM url_rewrite WHERE entity_uuid = '${productUuid}' AND entity_type = 'product'`
  );
}