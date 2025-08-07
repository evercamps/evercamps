import updateParticipant from '../../services/participant/updateParticipant.js';

export default async (request, response) => {
  const participant = await updateParticipant(request.params.id, request.body, {
    routeId: request.currentRoute.id
  });
  return participant;
};
