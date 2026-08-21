import createCategory from '../../services/category/createCategory.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

export default async function createCategoryApi(
  request: EvercampsRequest,
  response: EvercampsResponse
): Promise<unknown> {
  const result = await createCategory(request.body, {
    routeId: request.currentRoute.id
  });

  return result;
}