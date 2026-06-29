import type { RouteDefinition } from '../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'customerEdit',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'customerGrid',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'account',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'accountEdit',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: null,
    region: 'frontStore',
    middleware: [
      { id: 'auth', after: ['context'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'customerLoginJson',
    region: 'frontStore',
    middleware: [
      { id: 'login', after: ['bodyParser'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'customerLogoutJson',
    region: 'frontStore',
    middleware: [
      { id: 'logout', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'login',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'register',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'resetPasswordPage',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'updatePasswordPage',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'createCustomer',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createCustomer', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createCustomerAddress',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createCustomerAddress', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteCustomer',
    region: 'api',
    middleware: [
      { id: 'deleteCustomer', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteCustomerAddress',
    region: 'api',
    middleware: [
      { id: 'deleteCustomerAddress', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: null,
    region: 'api',
    middleware: [
      { id: 'getCurrentCustomer', after: ['context'], before: ['auth'] },
    ],
  },

  {
    routeId: 'resetPassword',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'resetPassword', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateCustomer',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateCustomer', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateCustomerAddress',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateCustomerAddress', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updatePassword',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updatePassword', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  }
];
