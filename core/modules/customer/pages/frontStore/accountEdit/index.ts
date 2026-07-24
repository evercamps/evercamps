import { translate } from '../../../../../lib/locale/translate/translate.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';

export default (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: () => void
): void => {
  // Check if the customer is logged in
  if (!request.isCustomerLoggedIn()) {
    // Redirect to login page
    response.redirect(buildUrl('login'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: translate('Account edit'),
      description: translate('Account edit')
    });

    next();
  }
};