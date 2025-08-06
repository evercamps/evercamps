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
import participantDataSchema from './participantDataSchema.json' with { type: 'json' };

export type ParticipantData = {  
  firstname?: string,
  lastname?: string,
  [key: string]: unknown
};

function validateParticipantDataBeforeInsert(data: ParticipantData) {
  const ajv = getAjv();
  (participantDataSchema as JSONSchemaType<any>).required = ['firstname', 'lastname'];
  const jsonSchema = getValueSync(
    'createParticipantDataJsonSchema',
    participantDataSchema,
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

async function insertParticipantData(data: ParticipantData, connection: PoolClient) {
  const participant = await insert('participant').given(data).execute(connection);  
  return participant;
}

/**
 * Create participant service. This service will create a participant with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createParticipant(data: ParticipantData, context: Record<string, unknown> = {}) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const participantData = await getValue(
      'participantDataBeforeCreate',
      data,
      context
    );
    // Validate participant data
    validateParticipantDataBeforeInsert(participantData);
    const { firstname, lastname } = participantData;    
    // Check if participant already exists
    const existingParticipant = await select()
      .from('participant')
      .where('firstname', '=', firstname)
      .andWhere('lastname', '=', lastname)
      .load(pool);

    if (existingParticipant) {
      throw new Error('Participant already exists');
    }    
    // Insert participant data
    const participant = await hookable(insertParticipantData, {
      ...context,
      connection
    })(participantData, connection);   

    await commit(connection);
    return participant;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Create customer service. This service will create a customer with all related data
 * @param {Object} data
 * @param {Object} context
 */
export default async (data: ParticipantData, context: Record<string, unknown> ): Promise<ParticipantData> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const participant = await hookable(createParticipant, context)(data, context);
  return participant;
};
