import {
  commit,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';

async function linkProductToFamily(
  familyUuid: string,
  productUuid: string,
  connection: PoolClient
) {
  const family = await select()
    .from('variant_group')
    .where('uuid', '=', familyUuid)
    .load(connection, false);
  if (!family) {
    throw new Error('Invalid product family');
  }

  const product = await select()
    .from('product')
    .where('uuid', '=', productUuid)
    .and('group_id', '=', family.attribute_group_id)
    .load(connection, false);
  if (!product) {
    throw new Error(
      'The product does not exist or uses a different attribute group'
    );
  }

  await update('product')
    .given({ variant_group_id: family.variant_group_id })
    .where('uuid', '=', productUuid)
    .execute(connection, false);

  // First product linked to a family becomes its default/representative
  // variant, rather than leaving default_variant_id NULL indefinitely.
  if (!family.default_variant_id) {
    await update('variant_group')
      .given({ default_variant_id: product.product_id })
      .where('variant_group_id', '=', family.variant_group_id)
      .execute(connection, false);
  }

  const variantAttributeIds = [
    family.attribute_one,
    family.attribute_two,
    family.attribute_three,
    family.attribute_four,
    family.attribute_five
  ].filter((a) => a !== null);

  const query = select().from('product_attribute_value_index');
  query
    .innerJoin('attribute')
    .on(
      'attribute.attribute_id',
      '=',
      'product_attribute_value_index.attribute_id'
    );
  query
    .where('product_attribute_value_index.product_id', '=', product.product_id)
    .and('product_attribute_value_index.attribute_id', 'in', variantAttributeIds);

  const attributes = await query.execute(connection, false);

  return {
    product,
    attributes: attributes.map((a) => ({
      attribute_id: a.attribute_id,
      attribute_code: a.attribute_code,
      option_id: a.option_id
    }))
  };
}

/**
 * Add product to family service. Links an existing product (which must
 * already share the family's attribute_group_id) into a product family by
 * setting its variant_group_id.
 * @param {String} familyUuid
 * @param {String} productUuid
 * @param {Object} context
 */
async function addProductToFamily(
  familyUuid: string,
  productUuid: string,
  context: Record<string, any>
) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const result = await hookable(linkProductToFamily, {
      ...context,
      connection
    })(familyUuid, productUuid, connection);

    await commit(connection);
    return result;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export default async (
  familyUuid: string,
  productUuid: string,
  context: Record<string, any>
) => {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(addProductToFamily, context)(familyUuid, productUuid, context);
};
