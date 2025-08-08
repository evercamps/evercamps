import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const registration = await getDelegate('createRegistration', request);  
  response.status(OK);
  response.json({
    data: {
      ...registration,
      // links: [
      //   {
      //     rel: 'registrationGrid',
      //     href: buildUrl('registrationGrid'),
      //     action: 'GET',
      //     types: ['text/xml']
      //   }
      // ],
      success: true
    }
  });
};
