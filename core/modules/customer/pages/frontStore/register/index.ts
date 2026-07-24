import { translate } from '../../../../../lib/locale/translate/translate.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import {
  getContextValue,
  setContextValue
} from '../../../../graphql/services/contextHelper.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';

interface CustomerTokenPayload {
  customer?: {
    customerId?: number;
  };
}

export default (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: () => void
): void => {
  // Check if the user is logged in
  const customerTokenPayload = getContextValue<CustomerTokenPayload | null>(
    request,
    'customerTokenPayload',
    null
  );

  if (customerTokenPayload?.customer?.customerId) {
    // Redirect to homepage
    response.redirect(buildUrl('homepage'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: translate('Create an account'),
      description: translate('Create an account')
    });

    next();
  }
};