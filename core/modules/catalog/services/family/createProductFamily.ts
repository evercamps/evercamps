import {
  commit,
  insert,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import type { ProductFamilyData } from '../../../../../includes/types/productFamily.js';
import productFamilyDataSchema from './productFamilyDataSchema.json' with { type: 'json' };

const ATTRIBUTE_SLOT_COLUMNS = [
  'attribute_one',
  'attribute_two',
  'attribute_three',
  'attribute_four',
  'attribute_five'
];

function validateProductFamilyDataBeforeInsert(data: ProductFamilyData) {
  const ajv = getAjv();
  (productFamilyDataSchema as any).required = ['attribute_group_id', 'attribute_codes'];
  const jsonSchema = getValueSync(
    'createProductFamilyDataJsonSchema',
    productFamilyDataSchema,
    {}
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate?.errors?.[0].message);
  }
}

async function resolveAttributeSlots(
  attributeCodes: string[],
  attributeGroupId: number,
  connection: PoolClient
) {
  if (attributeCodes.length === 0) {
    throw new Error('At least one attribute is required');
  }
  if (attributeCodes.length > 5) {
    throw new Error('A product family supports at most 5 attributes');
  }

  const attributes = await select()
    .from('attribute')
    .where('attribute_code', 'in', attributeCodes)
    .and('type', '=', 'select')
    .execute(connection);

  if (attributes.length !== attributeCodes.length) {
    throw new Error('Attribute must be of type select');
  }

  const attributeGroupLinks = await select()
    .from('attribute_group_link')
    .where('group_id', '=', attributeGroupId)
    .and(
      'attribute_id',
      'in',
      attributes.map((a) => a.attribute_id)
    )
    .execute(connection);

  if (attributeGroupLinks.length !== attributes.length) {
    throw new Error('Attribute must be assigned to the group');
  }

  const slots: Record<string, number> = {};
  // Preserve the caller's attribute_codes order rather than whatever order
  // the `IN` query happened to return rows in.
  attributeCodes.forEach((code, index) => {
    const attribute = attributes.find((a) => a.attribute_code === code);
    slots[ATTRIBUTE_SLOT_COLUMNS[index]] = attribute.attribute_id;
  });
  return slots;
}

async function checkUrlKeyIsUnique(urlKey: string | undefined, connection: PoolClient) {
  if (!urlKey) {
    return;
  }
  const existingFamily = await select()
    .from('variant_group')
    .where('url_key', '=', urlKey)
    .load(connection);
  if (existingFamily) {
    throw new Error(`Url key "${urlKey}" already exists`);
  }
  const existingProduct = await select()
    .from('product_description')
    .where('url_key', '=', urlKey)
    .load(connection);
  if (existingProduct) {
    throw new Error(`Url key "${urlKey}" already exists`);
  }
}

async function insertProductFamilyData(data: ProductFamilyData, connection: PoolClient) {
  const slots = await resolveAttributeSlots(
    data.attribute_codes,
    data.attribute_group_id,
    connection
  );
  await checkUrlKeyIsUnique(data.url_key, connection);

  const { attribute_codes, ...rest } = data;
  const insertData = {
    ...rest,
    ...slots
  };

  const result = await insert('variant_group').given(insertData).execute(connection);
  const family = await select()
    .from('variant_group')
    .where('variant_group_id', '=', result.insertId)
    .load(connection);
  return family;
}

/**
 * Create product family service. Creates a variant_group carrying both the
 * attribute-slot linkage and the family's shared content (name/description/
 * SEO/default variant).
 * @param {Object} data
 * @param {Object} context
 */
async function createProductFamily(data: ProductFamilyData, context: Record<string, any>) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const familyData = await getValue('productFamilyDataBeforeCreate', data);
    validateProductFamilyDataBeforeInsert(familyData);

    const family = await hookable(insertProductFamilyData, {
      ...context,
      connection
    })(familyData, connection);

    await commit(connection);
    return family;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export default async (data: ProductFamilyData, context: Record<string, any>) => {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const family = await hookable(createProductFamily, context)(data, context);
  return family;
};
