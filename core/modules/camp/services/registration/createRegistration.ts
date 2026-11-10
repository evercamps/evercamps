import {
  commit,
  insert,
  PoolClient,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { JSONSchemaType } from 'ajv';
import { emit } from '../../../../lib/event/emitter.js';
import {
  getConnection,
  pool
} from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import registrationDataSchema from './registrationDataSchema.json' with { type: 'json' };

export type RegistrationData = {  
  participantId?: number,
  productId?: number,
  [key: string]: any
};

function validateRegistrationDataBeforeInsert(data: RegistrationData) {
  const ajv = getAjv();
  (registrationDataSchema as JSONSchemaType<any>).required = ['registration_participant_id', 'registration_product_id'];
  const jsonSchema = getValueSync(
    'createRegistrationDataJsonSchema',
    registrationDataSchema,
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

async function insertRegistrationData(data: RegistrationData, connection: PoolClient) {
  const registration = await insert('registration').given(data).execute(connection);  
  return registration;
}

/**
 * Create registration service. This service will create a registration with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createRegistration(data: RegistrationData, context: Record<string, any> = {}) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const registrationData = await getValue(
      'registrationDataBeforeCreate',
      data,
      context
    );
    // Validate participant data
    validateRegistrationDataBeforeInsert(registrationData);
    const participantId = registrationData.registration_participant_id;
    const productId = registrationData.registration_product_id;

    // Variant: the one given (must belong to the product), otherwise the
    // product's default variant. Products with only real variants and none
    // given get no variant (null).
    let variantId = registrationData.product_variant_id;
    if (variantId === undefined || variantId === null || variantId === '') {
      const defaultVariant = await select('product_variant_id')
        .from('product_variant')
        .where('product_id', '=', productId)
        .and('is_default', '=', true)
        .load(connection, false);
      variantId = defaultVariant ? defaultVariant.product_variant_id : null;
    } else {
      const variant = await select('product_variant_id')
        .from('product_variant')
        .where('product_variant_id', '=', variantId)
        .and('product_id', '=', productId)
        .load(connection, false);
      if (!variant) {
        throw new Error('This variant does not belong to the product');
      }
      variantId = variant.product_variant_id;
    }
    registrationData.product_variant_id = variantId;

    // Duplicate rule: (participant, product, variant) - a participant can be
    // registered for several weeks (variants) of the same camp.
    // (Previously this read participant_id/product_id, which no caller sends,
    // so duplicates were never caught.)
    const duplicateQuery = select('registration_id')
      .from('registration')
      .where('registration_participant_id', '=', participantId)
      .and('registration_product_id', '=', productId);
    if (variantId === null) {
      duplicateQuery.and('product_variant_id', 'IS NULL', null);
    } else {
      duplicateQuery.and('product_variant_id', '=', variantId);
    }
    const existingRegistration = await duplicateQuery.load(connection, false);

    if (existingRegistration) {
      throw new Error('Registration already exists');
    }
    // Insert registration data
    const registration = await hookable(insertRegistrationData, context)(registrationData, connection); 

    await commit(connection);
    return registration;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Create registration service. This service will create a registration with all related data
 * @param {Object} data
 * @param {Object} context
 */
export default async (data: RegistrationData, context: Record<string, unknown> ): Promise<RegistrationData> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const participant = await hookable(createRegistration, context)(data, context);
  return participant;
};
