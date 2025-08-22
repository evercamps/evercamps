import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const customer = await getDelegate('addCustomer', request);  
  response.status(OK);
  response.json({
    data: {
      ...customer,      
      success: true
    }
  });
};
