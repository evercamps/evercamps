import type { RouteDefinition } from '../../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'taxSetting',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'createTaxClass',
    region: 'api',
    path: '/tax/classes',
    methods: ['POST'],
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'createTaxClass', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createTaxRate',
    region: 'api',
    path: '/tax/classes/:class_id/rates',
    methods: ['POST'],
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'createTaxRate', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteTaxRate',
    region: 'api',
    path: '/tax/rates/:id',
    methods: ['DELETE'],
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'deleteTaxRate', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateTaxClass',
    region: 'api',
    path: '/tax/classes/:id',
    methods: ['PATCH'],
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'updateTaxClass', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateTaxRate',
    region: 'api',
    path: '/tax/rates/:id',
    methods: ['PATCH'],
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'updateTaxRate', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  }
];
