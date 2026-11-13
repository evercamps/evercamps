import type { Request } from 'express';
import { setContextValue } from '../../../core.js';

export default (request: Request): void => {
  setContextValue(request, 'pageInfo', {
    title: 'Unmapped order lines',
    description: 'Map imported WooCommerce order lines without a variant to a product variant'
  });
};
