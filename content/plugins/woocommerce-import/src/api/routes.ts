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
    routeId: 'rollbackBatch',
    region: 'api',
    path: '/wc-import/batches/:id',
    methods: ['DELETE'],
    middleware: [
      { id: 'rollbackBatch', after: ['escapeHtml'], before: ['apiResponse'] }
    ]
  }
];
