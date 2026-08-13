import { translate } from '../../../../../lib/locale/translate/translate.js';
import { get } from '../../../../../lib/util/get.js';
import { setContextValue } from '../../../../../modules/graphql/services/contextHelper.js';
import type { NextFunction } from 'express';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';

export default (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): void => {
  // Get the keyword from the request query
  const keyword = get(request, 'query.keyword') as string | undefined;

  if (!keyword) {
    // Redirect to the home page if no keyword is provided
    response.redirect('/');
    return;
  }

  setContextValue(request, 'pageInfo', {
    title: translate('Search results for: ${keyword}', { keyword }),
    description: translate('Search results for: ${keyword}', { keyword }),
    url: request.url
  });

  next();
};