import type { Response } from 'express';
import { EvercampsRequest } from '../../../../types/request.js';
import addCustomer from "../../services/participant/addCustomer.js";

export default async (request: EvercampsRequest, response: Response) => {
  const { participantId } = request.params;
  const { customer_id } = request.body;
  const result = await addCustomer(participantId as string, customer_id, {
    routeId: request.currentRoute.id
  });
  return result;
};
