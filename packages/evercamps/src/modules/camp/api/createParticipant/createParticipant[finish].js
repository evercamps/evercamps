import createParticipant from '../../services/participant/createParticipant.js';

export default async (request, response) => {
  const result = await createParticipant(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};
