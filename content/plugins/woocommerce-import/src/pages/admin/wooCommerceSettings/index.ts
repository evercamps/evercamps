import type { Request } from 'express';
import { setContextValue } from '../../../core.js';

export default (request: Request): void => {
  setContextValue(request, 'pageInfo', {
    title: 'WooCommerce Import',
    description: 'Import and update products from a WooCommerce store'
  });
};
