import type { RouteDefinition } from '../../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'stripeReturn',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'capturePaymentIntent',
    region: 'api',
    path: '/stripe/paymentIntents/capture',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'capturePaymentIntent', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createPaymentIntent',
    region: 'api',
    path: '/stripe/paymentIntents',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createPaymentIntent', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'refundPaymentIntent',
    region: 'api',
    path: '/stripe/paymentIntents/refund',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'refundPaymentIntent', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'stripeWebHook',
    region: 'api',
    path: '/stripe/webhook',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyJson', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'webhook', after: ['bodyJson'], before: ['apiResponse'] },
    ],
  }
];
