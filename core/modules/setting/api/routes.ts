import type { RouteDefinition } from '../../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'adminOverview',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'paymentSetting',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'storeSetting',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'saveSetting',
    region: 'api',
    path: '/settings',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveSetting', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  }
];
