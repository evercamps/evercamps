import type { RouteDefinition } from '../../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'adminLogin',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'adminLoginJson',
    region: 'admin',
    middleware: [
      { id: 'logIn', after: ['bodyParser'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'adminLogoutJson',
    region: 'admin',
    middleware: [
      { id: 'logout', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'adminSetupTwoFa',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: null,
    region: 'admin',
    middleware: [
      { id: 'auth', after: ['context'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'enableTwoFa',
    region: 'api',
    path: '/admin/2fa/enable/:userId',
    methods: ['POST'],
    middleware: [
      { id: 'index', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'extendTwoFa',
    region: 'api',
    path: '/admin/2fa/extend/:userId',
    methods: ['POST'],
    middleware: [
      { id: 'index', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: null,
    region: 'api',
    middleware: [
      { id: 'getCurrentUser', after: ['context'], before: ['apiResponse'] },
      { id: 'demoAccountBlocking', after: ['getCurrentUser'], before: ['auth'] },
      { id: 'auth', after: ['getCurrentUser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'setupTwoFa',
    region: 'api',
    path: '/admin/2fa/setup',
    methods: ['POST'],
    middleware: [
      { id: 'index', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'verifyTwoFa',
    region: 'api',
    path: '/admin/2fa/verify',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'index', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  }
];
