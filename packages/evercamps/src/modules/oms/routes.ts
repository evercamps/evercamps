import type { RouteDefinition } from '../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'orderEdit',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'orderGrid',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'cancelOrder',
    region: 'api',
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'cancelOrder', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createShipment',
    region: 'api',
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'createShipment', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'lifetimesales',
    region: 'api',
    middleware: [
      { id: 'loadData', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'markDelivered',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'markDelivered', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'salestatistic',
    region: 'api',
    middleware: [
      { id: 'loadData', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateShipment',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateShipment', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  }
];
