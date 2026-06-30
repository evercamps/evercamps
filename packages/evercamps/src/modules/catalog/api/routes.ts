import type { RouteDefinition } from '../../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'attributeEdit',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'attributeGrid',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'attributeNew',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'categoryEdit',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'categoryGrid',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'categoryNew',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'collectionEdit',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'collectionGrid',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'collectionNew',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'productEdit',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'productGrid',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'productNew',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'catalogSearch',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
      { id: 'filters', after: ['index'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'categoryView',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
      { id: 'filters', after: ['index'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'productView',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'addProductToCategory',
    region: 'api',
    path: '/categories/:category_id/products',
    methods: ['POST'],
    middleware: [
      { id: 'addProducts', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
    ],
  },

  {
    routeId: 'addProductToCollection',
    region: 'api',
    path: '/collections/:collection_id/products',
    methods: ['POST'],
    middleware: [
      { id: 'addProducts', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
    ],
  },

  {
    routeId: 'addVariantItem',
    region: 'api',
    path: '/variantGroups/:id/items',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'addItem', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createAttribute',
    region: 'api',
    path: '/attributes',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createAttribute', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createAttributeGroup',
    region: 'api',
    path: '/attributeGroups',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveGroup', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createCategory',
    region: 'api',
    path: '/categories',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createCategory', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createCollection',
    region: 'api',
    path: '/collections',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createCollection', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createProduct',
    region: 'api',
    path: '/products',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createProduct', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createVariantGroup',
    region: 'api',
    path: '/variantGroups',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveGroup', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteAttribute',
    region: 'api',
    path: '/attributes/:id',
    methods: ['DELETE'],
    middleware: [
      { id: 'deleteAttribute', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteAttributeGroup',
    region: 'api',
    path: '/attributeGroups/:id',
    methods: ['DELETE'],
    middleware: [
      { id: 'deleteAttributeGroup', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteCategory',
    region: 'api',
    path: '/categories/:id',
    methods: ['DELETE'],
    middleware: [
      { id: 'deleteCategory', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteCollection',
    region: 'api',
    path: '/collections/:id',
    methods: ['DELETE'],
    middleware: [
      { id: 'deleteCollection', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteProduct',
    region: 'api',
    path: '/products/:id',
    methods: ['DELETE'],
    middleware: [
      { id: 'deleteProduct', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'removeProductFromCategory',
    region: 'api',
    path: '/categories/:category_id/products/:product_id',
    methods: ['DELETE'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'removeProducts', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'removeProductFromCollection',
    region: 'api',
    path: '/collections/:collection_id/products/:product_id',
    methods: ['DELETE'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'removeProducts', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'unlinkVariant',
    region: 'api',
    path: '/variants/:id',
    methods: ['DELETE'],
    middleware: [
      { id: 'multerNone', after: ['context'], before: ['auth'] },
      { id: 'unlinkVariants', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateAttribute',
    region: 'api',
    path: '/attributes/:id',
    methods: ['PATCH'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateAttribute', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateAttributeGroup',
    region: 'api',
    path: '/attributeGroups/:id',
    methods: ['PATCH'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveGroup', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateCategory',
    region: 'api',
    path: '/categories/:id',
    methods: ['PATCH'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateCategory', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateCollection',
    region: 'api',
    path: '/collections/:id',
    methods: ['PATCH'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateCollection', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateProduct',
    region: 'api',
    path: '/products/:id',
    methods: ['PATCH'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateProduct', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'variantSearch',
    region: 'api',
    path: '/variants',
    methods: ['GET'],
    middleware: [
      { id: 'loadVariants', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  }
];
