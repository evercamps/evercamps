import type { RouteDefinition } from '../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'couponEdit',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'couponGrid',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'couponNew',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'couponApply',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'validateCouponCode', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'applyCoupon', after: ['validateCouponCode'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createCoupon',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createCoupon', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteCoupon',
    region: 'api',
    middleware: [
      { id: 'deleteCoupon', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateCoupon',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateCoupon', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  }
];
