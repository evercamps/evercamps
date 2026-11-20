import { INVALID_PAYLOAD, OK } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { updateAttributeGroup } from '../../services/attributeGroup/attributeGroupService.js';

export default async function saveGroup(
  request: EvercampsRequest,
  response: EvercampsResponse
): Promise<void> {
  try {
    const group = await updateAttributeGroup(String(request.params.id), request.body, {
      routeId: 'updateAttributeGroup'
    });
    response.status(OK);
    response.json({ data: { ...group } });
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
