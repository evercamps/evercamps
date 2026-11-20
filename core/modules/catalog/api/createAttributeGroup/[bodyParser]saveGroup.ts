import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { INVALID_PAYLOAD, OK } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { createAttributeGroup } from '../../services/attributeGroup/attributeGroupService.js';

export default async function saveGroup(
  request: EvercampsRequest,
  response: EvercampsResponse
): Promise<void> {
  try {
    const group = await createAttributeGroup(request.body, { routeId: 'createAttributeGroup' });
    response.status(OK);
    response.json({
      data: {
        ...group,
        editUrl: buildUrl('attributeGroupEdit', { id: group.uuid })
      }
    });
  } catch (e) {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: e instanceof Error ? e.message : String(e)
      }
    });
  }
}
