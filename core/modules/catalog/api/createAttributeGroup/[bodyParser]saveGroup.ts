import {
  startTransaction,
  insert,
  commit,
  rollback,
  select
} from '@evershop/postgres-query-builder';
import { getConnection, pool } from '../../../../lib/postgres/connection.js';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

interface AttributeGroup {
  attribute_group_id: number;
  [key: string]: unknown;
}

export default async function createAttributeGroup(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  const connection = await getConnection();
  const data = request.body;

  try {
    await startTransaction(connection);

    const result = await insert('attribute_group')
      .given(data)
      .execute(connection);

    await commit(connection);

    const group = (await select()
      .from('attribute_group')
      .where('attribute_group_id', '=', result.insertId)
      .load(pool)) as AttributeGroup | null;

    response.status(OK);
    response.json({
      data: {
        ...group
      }
    });
  } catch (e) {
    await rollback(connection);

    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : String(e)
      }
    });
  }
}