import type { RouteDefinition } from '../../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'submitContactMessage',
    region: 'api',
    path: '/contact-messages',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      // After payloadValidate and escapeHtml, so only valid input is stored
      {
        id: 'submitContactMessage',
        after: ['escapeHtml'],
        before: ['apiResponse']
      },
      {
        id: 'sendContactEmail',
        after: ['submitContactMessage'],
        before: ['apiResponse']
      }
    ]
  }
];
