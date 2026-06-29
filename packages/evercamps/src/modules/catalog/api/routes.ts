import type { RouteDefinition } from '../../lib/middleware/types.js';

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
    middleware: [
      { id: 'addProducts', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
    ],
  },

  {
    routeId: 'addProductToCollection',
    region: 'api',
    middleware: [
      { id: 'addProducts', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
    ],
  },

  {
    routeId: 'addVariantItem',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'addItem', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createAttribute',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createAttribute', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createAttributeGroup',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveGroup', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createCategory',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createCategory', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createCollection',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createCollection', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createProduct',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createProduct', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createVariantGroup',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveGroup', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteAttribute',
    region: 'api',
    middleware: [
      { id: 'deleteAttribute', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteAttributeGroup',
    region: 'api',
    middleware: [
      { id: 'deleteAttributeGroup', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteCategory',
    region: 'api',
    middleware: [
      { id: 'deleteCategory', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteCollection',
    region: 'api',
    middleware: [
      { id: 'deleteCollection', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteProduct',
    region: 'api',
    middleware: [
      { id: 'deleteProduct', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'removeProductFromCategory',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'removeProducts', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'removeProductFromCollection',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'removeProducts', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'unlinkVariant',
    region: 'api',
    middleware: [
      { id: 'multerNone', after: ['context'], before: ['auth'] },
      { id: 'unlinkVariants', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateAttribute',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateAttribute', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateAttributeGroup',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveGroup', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateCategory',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateCategory', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateCollection',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateCollection', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateProduct',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateProduct', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'variantSearch',
    region: 'api',
    middleware: [
      { id: 'loadVariants', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  }
];
