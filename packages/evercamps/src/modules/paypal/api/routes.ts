import type { RouteDefinition } from '../../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'paypalCancel',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'paypalReturn',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'paypalAuthorizePayment',
    region: 'api',
    path: '/paypal/authorizedTransactions',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'authorize', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'paypalCaptureAuthorizedPayment',
    region: 'api',
    path: '/paypal/authorizations/capture',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'capture', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'paypalCapturePayment',
    region: 'api',
    path: '/paypal/captureTransactions',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'capture', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'paypalCreateOrder',
    region: 'api',
    path: '/paypal/orders',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createOrder', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  }
];
