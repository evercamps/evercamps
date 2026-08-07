import uniqid from 'uniqid';
import { OK, INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import addProductToFamily from '../../services/family/addProductToFamily.js';

export default async (request, response, next) => {
  const { id: groupId } = request.params;
  const { product_id } = request.body;

  try {
    const { product, attributes } = await addProductToFamily(groupId, product_id, {
      routeId: request.currentRoute?.id
    });

    response.status(OK);
    response.json({
      data: {
        id: uniqid(),
        attributes,
        product
      }
    });
  } catch (e) {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: e.message
      }
    });
  }
};
