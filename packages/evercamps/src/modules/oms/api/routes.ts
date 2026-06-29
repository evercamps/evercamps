import type { RouteDefinition } from '../../../lib/middleware/types.js';

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
    path: '/orders/:id/cancel',
    methods: ['POST'],
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'cancelOrder', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createShipment',
    region: 'api',
    path: '/orders/:id/shipments',
    methods: ['POST'],
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'createShipment', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'lifetimesales',
    region: 'api',
    path: '/lifetimesales',
    methods: ['GET'],
    middleware: [
      { id: 'loadData', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'markDelivered',
    region: 'api',
    path: '/deliveries',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'markDelivered', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'salestatistic',
    region: 'api',
    path: '/salestatistic',
    methods: ['GET'],
    middleware: [
      { id: 'loadData', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateShipment',
    region: 'api',
    path: '/orders/:order_id/shipments/:shipment_id',
    methods: ['PATCH'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateShipment', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  }
];
