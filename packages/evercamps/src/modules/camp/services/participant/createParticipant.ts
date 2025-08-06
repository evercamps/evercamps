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
  firstName?: string,
  lastName?: string,
  [key: string]: any
};

function validateParticipantDataBeforeInsert(data: ParticipantData) {
  const ajv = getAjv();
  (participantDataSchema as JSONSchemaType<any>).required = ['first_name', 'last_name'];
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
async function createParticipant(data: ParticipantData, context: Record<string, any> = {}) {
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
    const { first_name, last_name } = participantData;    
    // Check if participant already exists
    const existingParticipant = await select()
      .from('participant')
      .where('first_name', '=', first_name)
      .andWhere('last_name', '=', last_name)
      .load(pool);

    if (existingParticipant) {
      throw new Error('Participant already exists');
    }    
    // Insert participant data
    const participant = await hookable(insertParticipantData, context)(participantData, connection); 

    await commit(connection);
    return participant;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Create participant service. This service will create a participant with all related data
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
