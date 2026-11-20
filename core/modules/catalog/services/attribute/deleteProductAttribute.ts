import {
  commit,
  del,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';

async function deleteAttributeData(uuid: string, connection: PoolClient) {
  await del('attribute').where('uuid', '=', uuid).execute(connection);
}
/**
 * Delete attribute service. This service will delete an attribute with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteAttribute(uuid: string, context: Record<string, any>) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const attribute = await select()
      .from('attribute')
      .where('uuid', '=', uuid)
      .load(connection);

    if (!attribute) {
      throw new Error('Invalid attribute id');
    }

    // Deleting would cascade into variant_attribute_value and silently strip
    // the option (e.g. the camp week) from existing variants.
    const usedByVariant = await select('variant_attribute_value_id')
      .from('variant_attribute_value')
      .where('attribute_id', '=', attribute.attribute_id)
      .load(connection);
    if (usedByVariant) {
      throw new Error(
        `The attribute "${attribute.attribute_name}" is used by product variants`
      );
    }
    await hookable(deleteAttributeData, { ...context, connection, attribute })(
      uuid,
      connection
    );
    await commit(connection);
    return attribute;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Delete attribute service. This service will delete an attribute with all related data
 * @param {String} uuid
 * @param {Object} context
 */
export default async (uuid: string, context: Record<string, any>) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const attribute = await hookable(deleteAttribute, context)(uuid, context);
  return attribute;
};
