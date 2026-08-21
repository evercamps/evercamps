import createProductAttribute from '../../services/attribute/createProductAttribute.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

export default async function createAttribute(
  request: EvercampsRequest,
  response: EvercampsResponse
): Promise<unknown> {
  const attribute = await createProductAttribute(request.body, {
    routeId: request.currentRoute.id
  });

  return attribute;
}