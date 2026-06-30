import type { RouteDefinition } from '../../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: null,
    region: 'global',
    middleware: [
      { id: 'context' },
      { id: 'notFound', after: ['auth'], before: ['response'] },
      { id: 'response', after: ['auth'], before: ['errorHandler'] },
      { id: 'errorHandler', after: ['response'] },
    ],
  },

  {
    routeId: null,
    region: 'admin',
    middleware: [
      { id: 'isAdmin', after: ['context'], before: ['auth'] },
    ],
  },

  {
    routeId: null,
    region: 'api',
    middleware: [
      { id: 'context' },
      { id: 'payloadValidate', after: ['auth'], before: ['apiResponse'] },
      { id: 'escapeHtml', after: ['payloadValidate'], before: ['apiResponse'] },
      { id: 'apiResponse', after: ['auth'], before: ['apiErrorHandler'] },
      { id: 'apiErrorHandler', after: ['apiResponse'] },
    ],
  }
];
