import { translate } from '../../../../../lib/locale/translate/translate.js';
import { setContextValue } from '../../../../../modules/graphql/services/contextHelper.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';

export default (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: () => void
): void => {
  setContextValue(request, 'pageInfo', {
    title: translate('Shop'),
    description: translate('Browse all products'),
    url: request.url
  });
  next();
};
