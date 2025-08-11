import createRegistration from '../../services/registration/createRegistration.js';

export default async (request, response) => {
  const result = await createRegistration(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};
