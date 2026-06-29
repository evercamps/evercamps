import type { RouteDefinition } from '../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: null,
    region: 'global',
    middleware: [
      { id: 'bodyParser', after: ['auth'], before: ['buildQuery'] },
      { id: 'buildQuery', after: ['bodyParser'], before: ['graphql'] },
      { id: 'graphql', after: ['buildQuery'], before: ['notFound'] },
    ],
  },

  {
    routeId: 'adminGraphql',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'graphql', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'graphql',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'removeUser', after: ['auth'], before: ['graphql'] },
      { id: 'graphql', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  }
];
