import addCustomer from "../../services/participant/addCustomer.js";

export default async (request, response) => {
  const { participantId } = request.params;
  const { customer_id } = request.body;
  const result = await addCustomer(participantId, customer_id, {
    routeId: request.currentRoute.id
  });
  return result;
};
