import type { RouteDefinition } from '../../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'codCapturePayment',
    region: 'api',
    path: '/cod/captures',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'capture', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createOrder',
    region: 'api',
    middleware: [
      { id: 'addOrderPlacedEvent', after: ['placeOrder'], before: ['apiResponse'] },
    ],
  }
];
