import { EvercampsRequest } from '../../../../types/request.js';
import { EvercampsResponse } from '../../../../types/response.js';
import updateCategory from '../../services/category/updateCategory.js';

export default async function updateCategoryDelegate(
  request: EvercampsRequest,
  response: EvercampsResponse
) {
  const category = await updateCategory(
    request.params.id as string,
    request.body,
    {
      routeId: request.currentRoute.id
    }
  );

  return category;
}