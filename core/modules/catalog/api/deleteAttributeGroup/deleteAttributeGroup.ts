import { del, select } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

interface AttributeGroup {
  attribute_group_id: number | string;
  uuid: string;
  [key: string]: unknown;
}

export default async function deleteAttributeGroup(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  const connection = await getConnection();

  try {
    const { id } = request.params;

    const attributeGroup = (await select()
      .from('attribute_group')
      .where('uuid', '=', id)
      .load(connection)) as AttributeGroup | null;

    if (!attributeGroup) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Attribute group not found'
        }
      });
      return;
    }

    if (parseInt(String(attributeGroup.attribute_group_id), 10) === 1) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Can not delete the default attribute group'
        }
      });
      return;
    }

    await del('attribute_group')
      .where('uuid', '=', id)
      .execute(connection);

    response.status(OK);
    response.json({
      data: attributeGroup
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