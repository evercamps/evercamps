import { translate } from '../../../../../lib/locale/translate/translate.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: () => void
): void => {
  // Check if the user is logged in
  if (request.isCustomerLoggedIn()) {
    // Redirect to homepage
    response.redirect(buildUrl('homepage'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: translate('Login'),
      description: translate('Login')
    });

    next();
  }
};