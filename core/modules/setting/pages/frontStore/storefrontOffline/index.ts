import { translate } from '../../../../../lib/locale/translate/translate.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: any, response: any) => {
  // Only shown in place of another page while the storefront is offline
  // (see storefrontOfflineMiddleware, which sets the 503). Visiting the
  // route's own URL is a 404.
  if (response.statusCode !== 503) {
    response.status(404);
    return;
  }
  setContextValue(request, 'pageInfo', {
    title: translate('We are almost ready'),
    description: translate('Our shop is not available yet.')
  });
};
