import type { Request } from 'express';
import { setContextValue } from '../../../core.js';

export default (request: Request): void => {
  setContextValue(request, 'pageInfo', {
    title: 'Fiscal attests',
    description: 'Organiser, recognition and Belcotax settings for fiscal attests (281.86)'
  });
};
