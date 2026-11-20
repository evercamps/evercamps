import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { createAttributeGroup } from '../../services/attributeGroup/attributeGroupService.js';
import { sendAttributeGroupError } from '../../services/attributeGroup/sendAttributeGroupError.js';

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
    sendAttributeGroupError(response, e);
  }
}
