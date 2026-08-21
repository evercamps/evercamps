import { update, select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

interface AttributeGroup {
  uuid: string;
  [key: string]: unknown;
}

export default async function updateAttributeGroup(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  const data = request.body;

  try {
    const group = (await select()
      .from('attribute_group')
      .where('uuid', '=', request.params.id)
      .load(pool)) as AttributeGroup | null;

    if (!group) {
      response.status(INVALID_PAYLOAD);
      throw new Error('Invalid attribute group id');
    }

    await update('attribute_group')
      .given(data)
      .where('uuid', '=', request.params.id)
      .execute(pool);

    const updatedGroup = await select()
      .from('attribute_group')
      .where('uuid', '=', request.params.id)
      .load(pool);

    response.status(OK);
    response.json({
      data: {
        ...updatedGroup
      }
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : String(e)
      }
    });
  }
}