import {
  commit,
  del,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import { getValue } from '../../../../lib/util/registry.js';
import { validateParticipantDataBeforeInsert } from './updateParticipant.js';

export type MergeParticipantsInput = {
  survivorUuid: string;
  duplicateUuid: string;
  fields?: Record<string, unknown>;
  registrationOverrides?: Record<number, 'survivor' | 'duplicate'>;
};

export type MergeParticipantsResult = {
  survivor: Record<string, any>;
  movedRegistrations: number;
  droppedRegistrations: number;
};

type ParticipantRow = Record<string, any> & { participant_id: number; uuid: string };
type RegistrationRow = { registration_id: number; registration_product_id: number };

async function loadParticipantByUuid(
  uuid: string,
  connection: PoolClient
): Promise<ParticipantRow | undefined> {
  return select().from('participant').where('uuid', '=', uuid).load(connection);
}

/**
 * Moves the duplicate's registrations onto the survivor. For a product both participants are
 * registered for, `registrationOverrides` decides which registration row wins (default: the
 * survivor's) — the other one is deleted rather than moved.
 */
async function resolveRegistrations(
  survivorId: number,
  duplicateId: number,
  registrationOverrides: Record<number, 'survivor' | 'duplicate'>,
  connection: PoolClient
): Promise<{ movedRegistrations: number; droppedRegistrations: number }> {
  const survivorRegistrations: RegistrationRow[] = await select(
    'registration_id',
    'registration_product_id'
  )
    .from('registration')
    .where('registration_participant_id', '=', survivorId)
    .execute(connection);
  const duplicateRegistrations: RegistrationRow[] = await select(
    'registration_id',
    'registration_product_id'
  )
    .from('registration')
    .where('registration_participant_id', '=', duplicateId)
    .execute(connection);

  const survivorByProduct = new Map(
    survivorRegistrations.map((registration) => [
      registration.registration_product_id,
      registration
    ])
  );

  const idsToMove: number[] = [];
  const idsToDrop: number[] = [];

  for (const duplicateRegistration of duplicateRegistrations) {
    const collidingSurvivorRegistration = survivorByProduct.get(
      duplicateRegistration.registration_product_id
    );
    if (!collidingSurvivorRegistration) {
      idsToMove.push(duplicateRegistration.registration_id);
      continue;
    }
    const winner =
      registrationOverrides[duplicateRegistration.registration_product_id] === 'duplicate'
        ? 'duplicate'
        : 'survivor';
    if (winner === 'duplicate') {
      idsToDrop.push(collidingSurvivorRegistration.registration_id);
      idsToMove.push(duplicateRegistration.registration_id);
    } else {
      idsToDrop.push(duplicateRegistration.registration_id);
    }
  }

  if (idsToDrop.length > 0) {
    await del('registration').where('registration_id', 'in', idsToDrop).execute(connection);
  }
  if (idsToMove.length > 0) {
    await update('registration')
      .given({ registration_participant_id: survivorId })
      .where('registration_id', 'in', idsToMove)
      .execute(connection);
  }

  return { movedRegistrations: idsToMove.length, droppedRegistrations: idsToDrop.length };
}

async function mergeParticipantData(
  survivor: ParticipantRow,
  duplicate: ParticipantRow,
  fields: Record<string, unknown>,
  registrationOverrides: Record<number, 'survivor' | 'duplicate'>,
  connection: PoolClient,
  context: Record<string, any>
): Promise<MergeParticipantsResult> {
  if (Object.keys(fields).length > 0) {
    // The survivor's own identity columns are never a valid "winning value" pick.
    const { participant_id, uuid, ...safeFields } = fields as Record<string, unknown>;
    await update('participant')
      .given(safeFields)
      .where('participant_id', '=', survivor.participant_id)
      .execute(connection);
  }

  const { movedRegistrations, droppedRegistrations } = await resolveRegistrations(
    survivor.participant_id,
    duplicate.participant_id,
    registrationOverrides,
    connection
  );

  // Give plugins a chance to move their own side-table data before the duplicate row disappears.
  await getValue(
    'participantMergeBeforeDelete',
    { survivorId: survivor.participant_id, duplicateId: duplicate.participant_id },
    { ...context, connection }
  );

  await del('participant')
    .where('participant_id', '=', duplicate.participant_id)
    .execute(connection);

  const mergedSurvivor = await select()
    .from('participant')
    .where('participant_id', '=', survivor.participant_id)
    .load(connection);

  return { survivor: mergedSurvivor, movedRegistrations, droppedRegistrations };
}

/**
 * Merge two participants into one. The duplicate's registrations are moved onto the survivor
 * (colliding ones resolved via `registrationOverrides`), the duplicate row is then deleted.
 * @param {Object} input
 * @param {Object} context
 */
async function mergeParticipants(
  input: MergeParticipantsInput,
  context: Record<string, any> = {}
): Promise<MergeParticipantsResult> {
  const {
    survivorUuid,
    duplicateUuid,
    fields = {},
    registrationOverrides = {}
  } = input;

  if (!survivorUuid || !duplicateUuid) {
    throw new Error('survivorUuid and duplicateUuid are required');
  }
  if (survivorUuid === duplicateUuid) {
    throw new Error('survivorUuid and duplicateUuid must be different');
  }

  if (Object.keys(fields).length > 0) {
    validateParticipantDataBeforeInsert(fields);
  }

  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const survivor = await loadParticipantByUuid(survivorUuid, connection);
    if (!survivor) {
      throw new Error('Survivor participant not found');
    }
    const duplicate = await loadParticipantByUuid(duplicateUuid, connection);
    if (!duplicate) {
      throw new Error('Duplicate participant not found');
    }

    const result = await hookable(mergeParticipantData, context)(
      survivor,
      duplicate,
      fields,
      registrationOverrides,
      connection,
      context
    );

    await commit(connection);
    return result;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Merge two participants into one.
 * @param {Object} input
 * @param {Object} context
 */
export default async (
  input: MergeParticipantsInput,
  context: Record<string, unknown> = {}
): Promise<MergeParticipantsResult> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(mergeParticipants, context)(input, context);
};
