// Kept local rather than imported from includes/lib/middleware/types.ts:
// that file lives outside this plugin's own TS project (content/plugins/*
// has its own tsconfig/rootDir), and this shape is small enough to duplicate
// rather than reach across project boundaries for.
interface MiddlewareEntry {
  id: string;
  after?: string[];
  before?: string[];
}

interface RouteDefinition {
  routeId: string | string[] | null;
  region: 'api' | 'admin' | 'frontStore' | 'global';
  path?: string;
  methods?: string[];
  access?: 'public' | 'private';
  middleware: MiddlewareEntry[];
}

export const routes: RouteDefinition[] = [
  {
    routeId: 'wooCommerceSettings',
    region: 'admin',
    middleware: [{ id: 'index', after: ['auth'], before: ['buildQuery'] }]
  },

  {
    routeId: 'importProducts',
    region: 'api',
    path: '/wc-import/products',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'importProducts', after: ['escapeHtml'], before: ['apiResponse'] }
    ]
  },

  {
    routeId: 'importOrders',
    region: 'api',
    path: '/wc-import/orders',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'importOrders', after: ['escapeHtml'], before: ['apiResponse'] }
    ]
  },

  {
    routeId: 'rollbackBatch',
    region: 'api',
    path: '/wc-import/batches/:id',
    methods: ['DELETE'],
    middleware: [
      { id: 'rollbackBatch', after: ['escapeHtml'], before: ['apiResponse'] }
    ]
  },

  {
    routeId: 'batchFailures',
    region: 'api',
    path: '/wc-import/batches/:id/failures',
    methods: ['GET'],
    middleware: [
      { id: 'batchFailures', after: ['escapeHtml'], before: ['apiResponse'] }
    ]
  },

  {
    routeId: 'wooCommerceLineMapping',
    region: 'admin',
    middleware: [{ id: 'index', after: ['auth'], before: ['buildQuery'] }]
  },

  {
    routeId: 'lineMappingList',
    region: 'api',
    path: '/wc-import/line-mapping',
    methods: ['GET'],
    middleware: [
      { id: 'lineMappingList', after: ['escapeHtml'], before: ['apiResponse'] }
    ]
  },

  {
    routeId: 'lineMappingProducts',
    region: 'api',
    path: '/wc-import/line-mapping/products',
    methods: ['GET'],
    middleware: [
      { id: 'lineMappingProducts', after: ['escapeHtml'], before: ['apiResponse'] }
    ]
  },

  {
    routeId: 'lineMappingSave',
    region: 'api',
    path: '/wc-import/line-mapping/save',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'lineMappingSave', after: ['escapeHtml'], before: ['apiResponse'] }
    ]
  },

  {
    routeId: 'lineMappingVariantForm',
    region: 'api',
    path: '/wc-import/line-mapping/variant-form',
    methods: ['GET'],
    middleware: [
      { id: 'lineMappingVariantForm', after: ['escapeHtml'], before: ['apiResponse'] }
    ]
  },

  {
    routeId: 'lineMappingCreateVariant',
    region: 'api',
    path: '/wc-import/line-mapping/create-variant',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'lineMappingCreateVariant', after: ['escapeHtml'], before: ['apiResponse'] }
    ]
  }
];
