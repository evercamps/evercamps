import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import removeCustomer from '../../services/participant/removeCustomer.js';
export default async (request, response, next) => {
  try {
    const { participantId } = request.params;
    const participant = await removeCustomer(participantId, {
      routeId: request.currentRoute.id
    });
    response.status(OK);
    response.json({
      data: participant
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
