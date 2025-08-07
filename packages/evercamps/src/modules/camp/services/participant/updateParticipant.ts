import {
  commit,
  update,
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
import { ParticipantData } from './createParticipant.js';



function validateParticipantDataBeforeInsert(data: ParticipantData) {
  const ajv = getAjv();
  participantDataSchema.required = [];
  const jsonSchema = getValueSync(
    'updateParticipantDataJsonSchema',
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

async function updateParticipantData(uuid: string, data: ParticipantData, connection: PoolClient) {
  const query = select().from('participant');  
  const participant = await query.where('uuid', '=', uuid).load(connection);
  if (!participant) {
    throw new Error('Requested participant not found');
  }
  try {
    const newParticipant = await update('participant')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);
    Object.assign(participant, newParticipant);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }
  return participant;
}

/**
 * Update participant service. This service will update a participant with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
async function updateParticipant(uuid: string, data: ParticipantData, context: Record<string, any> = {}) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const participantData = await getValue('participantDataBeforeUpdate', data);
    // Validate participant data
    validateParticipantDataBeforeInsert(participantData);
    const { first_name, last_name } = participantData;   
       
    // Insert participant data
    const participant = await hookable(updateParticipantData, context)(uuid, participantData, connection); 

    await commit(connection);
    return participant;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Update participant service. This service will update a participant with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
export default async (uuid:string, data: ParticipantData, context: Record<string, unknown> ) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const participant = await hookable(updateParticipant, context)(uuid, data, context);
  return participant;
};
