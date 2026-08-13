import { update } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

interface RequestBody {
  id: string | number;
}

export default async function removeVariantGroup(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  const connection = await getConnection();

  try {
    const { id } = request.body as RequestBody;

    await update('product')
      .given({
        variant_group_id: null,
        visibility: null
      })
      .where('product_id', '=', parseInt(`0${id}`, 10))
      .execute(connection);

    response.status(OK).json({
      data: {}
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : String(e)
      }
    });
  }
}