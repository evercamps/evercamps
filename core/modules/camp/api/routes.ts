import type { RouteDefinition } from '../../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'campSetting',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'participantEdit',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'participantGrid',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'participantNew',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'registrationGrid',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'addCustomer',
    region: 'api',
    path: '/participants/:participantId/customer',
    methods: ['POST'],
    middleware: [
      { id: 'addCustomer', after: ['escapeHtml'], before: ['finish'] },
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createParticipant',
    region: 'api',
    path: '/participants',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createParticipant', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createRegistration',
    region: 'api',
    path: '/registrations',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createRegistration', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteParticipant',
    region: 'api',
    path: '/participants/:id',
    methods: ['DELETE'],
    middleware: [
      { id: 'deleteParticipant', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteRegistration',
    region: 'api',
    path: '/registrations/:id',
    methods: ['DELETE'],
    middleware: [
      { id: 'deleteRegistration', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'removeCustomer',
    region: 'api',
    path: '/participants/:participantId/customer',
    methods: ['DELETE'],
    middleware: [
      { id: 'removeCustomer', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateParticipant',
    region: 'api',
    path: '/participants/:id',
    methods: ['PATCH'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateParticipant', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  }
];
