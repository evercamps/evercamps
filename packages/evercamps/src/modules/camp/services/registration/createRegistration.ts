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
    throw new Error(validate.errors[0].message);
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
    const { participant_id , product_id } = registrationData;    
    // Check if participant already exists
    const existingRegistration = await select()
      .from('registration')
      .where('registration_participant_id', '=', participant_id)
      .andWhere('registration_product_id', '=', product_id)
      .load(pool);

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
