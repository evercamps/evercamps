import { OK } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { deleteAttributeGroup as deleteGroup } from '../../services/attributeGroup/attributeGroupService.js';
import { sendAttributeGroupError } from '../../services/attributeGroup/sendAttributeGroupError.js';

export default async function deleteAttributeGroup(
  request: EvercampsRequest,
  response: EvercampsResponse
): Promise<void> {
  try {
    const group = await deleteGroup(String(request.params.id), { routeId: 'deleteAttributeGroup' });
    response.status(OK);
    response.json({ data: group });
  } catch (e) {
    sendAttributeGroupError(response, e);
  }
}
