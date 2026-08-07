import { translate } from '../../../../../lib/locale/translate/translate.js';
import { setContextValue } from '../../../../../modules/graphql/services/contextHelper.js';

export default (request, response, next) => {
  setContextValue(request, 'pageInfo', {
    title: translate('All Products'),
    description: translate('Browse all products'),
    url: request.url
  });
  next();
};
