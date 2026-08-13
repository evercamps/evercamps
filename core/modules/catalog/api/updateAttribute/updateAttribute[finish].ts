import { EvercampsRequest } from '../../../../types/request.js';
import { EvercampsResponse } from '../../../../types/response.js';
import updateProductAttribute from '../../services/attribute/updateProductAttribute.js';

export default async function updateProductAttributeApi(
  request: EvercampsRequest,
  response: EvercampsResponse,
) {
  const result = await updateProductAttribute(
    request.params.id as string,
    request.body,
    {}
  );

  return result;
}