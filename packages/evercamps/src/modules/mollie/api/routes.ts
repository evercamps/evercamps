import type { RouteDefinition } from '../../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'mollieReturn',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'mollieCreatePayment',
    region: 'api',
    path: '/mollie/payments',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'mollieCreatePayment', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'mollieRefundPayment',
    region: 'api',
    path: '/mollie/payments/refund',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'mollieRefundPayment', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'mollieWebhook',
    region: 'api',
    path: '/mollie/webhook',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyJson', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'webhook', after: ['bodyJson'], before: ['apiResponse'] },
    ],
  }
];
