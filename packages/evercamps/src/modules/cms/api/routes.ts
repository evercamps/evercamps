import type { RouteDefinition } from '../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'adminStaticAsset',
    region: 'admin',
    middleware: [
      { id: 'staticAssets', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'cmsPageEdit',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'cmsPageGrid',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'cmsPageNew',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'dashboard',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'widgetEdit',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'widgetGrid',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'widgetNew',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
      { id: 'typeValidate', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'cmsPageView',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'homepage',
    region: 'frontStore',
    middleware: [
      { id: 'meta', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'staticAsset',
    region: 'frontStore',
    middleware: [
      { id: 'staticAssets', after: ['context'], before: ['auth'] },
    ],
  },

  {
    routeId: 'createCmsPage',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createPage', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createWidget',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createWidget', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteCmsPage',
    region: 'api',
    middleware: [
      { id: 'deleteCmsPage', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteWidget',
    region: 'api',
    middleware: [
      { id: 'deleteWidget', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'fileBrowser',
    region: 'api',
    middleware: [
      { id: 'browFiles', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'validatePath', after: ['context'], before: ['auth'] },
    ],
  },

  {
    routeId: 'fileDelete',
    region: 'api',
    middleware: [
      { id: 'deleteFile', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'validatePath', after: ['context'], before: ['auth'] },
    ],
  },

  {
    routeId: 'fileUpload',
    region: 'api',
    middleware: [
      { id: 'validatePath', after: ['context'], before: ['multerFile'] },
      { id: 'multerFile', after: ['context'], before: ['auth'] },
      { id: 'upload', after: ['multerFile'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'folderCreate',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createFolder', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'validatePath', after: ['context'], before: ['auth'] },
    ],
  },

  {
    routeId: 'imageUpload',
    region: 'api',
    middleware: [
      { id: 'validatePath', after: ['context'], before: ['multerFile'] },
      { id: 'multerFile', after: ['context'], before: ['auth'] },
      { id: 'verifyImages', after: ['multerFile'], before: ['upload'] },
      { id: 'upload', after: ['multerFile'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateCmsPage',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updatePage', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateWidget',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateWidget', after: ['escapeHtml'], before: ['finish'] },
      { id: 'finish', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  }
];
