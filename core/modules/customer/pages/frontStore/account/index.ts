import type { NextFunction } from 'express';

import { translate } from '../../../../../lib/locale/translate/translate.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';

export default (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): void => {
  // Check if the customer is logged in
  if (!request.isCustomerLoggedIn()) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('login'));
    return;
  }

  setContextValue(request, 'pageInfo', {
    title: translate('Account details'),
    description: translate('Account details')
  });

  next();
};