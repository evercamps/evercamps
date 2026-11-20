import { OK } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { updateAttributeGroup } from '../../services/attributeGroup/attributeGroupService.js';
import { sendAttributeGroupError } from '../../services/attributeGroup/sendAttributeGroupError.js';

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
    sendAttributeGroupError(response, e);
  }
}
