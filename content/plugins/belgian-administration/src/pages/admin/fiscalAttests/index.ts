import type { Request } from 'express';
import { setContextValue } from '../../../core.js';

export default (request: Request): void => {
  setContextValue(request, 'pageInfo', {
    title: 'Fiscal attests',
    description: 'Fiscal attests (281.86) per income year'
  });
};
