import type { RouteDefinition } from '../../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'sendTestEmail',
    region: 'api',
    path: '/email/test',
    methods: ['POST'],
    access: 'private',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'sendTestEmail', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'resendEmail',
    region: 'api',
    path: '/email/logs/:id/resend',
    methods: ['POST'],
    access: 'private',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'resendEmail', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'resendOrderConfirmation',
    region: 'api',
    path: '/email/orders/:id/resend-confirmation',
    methods: ['POST'],
    access: 'private',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'resendOrderConfirmation', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },
];
