import type { Express } from 'express';
import express from 'express';
import { error } from '../../lib/log/logger.js';
import { Handler } from '../../lib/middleware/Handler.js';
import { getModuleMiddlewares } from '../../lib/middleware/index.js';
import { loadModuleRoutes } from '../../lib/router/loadModuleRoutes.js';
import { getRoutes } from '../../lib/router/Router.js';
import { getEnabledExtensions } from '../extension/index.js';
import { addDefaultMiddlewareFuncs } from './addDefaultMiddlewareFuncs.js';
import { getCoreModules } from './loadModules.js';

export const createApp = async (): Promise<Express> => {
  const app = express();
  app.enable('trust proxy');
  const modules = getCoreModules();

  for (const module of modules) {
    try {
      await getModuleMiddlewares(module.path);
      loadModuleRoutes(module.path);
    } catch (e) {
      error(e);
      process.exit(0);
    }
  }

  const extensions = getEnabledExtensions();
  for (const extension of extensions) {
    try {
      await getModuleMiddlewares(extension.path);
      loadModuleRoutes(extension.path);
    } catch (e) {
      error(e);
      process.exit(0);
    }
  }

  addDefaultMiddlewareFuncs(app);
  const routes = getRoutes();
  routes.forEach((route) => {
    route.method.forEach((method) => {
      switch (method.toUpperCase()) {
        case 'GET':
          app.get(route.path, Handler.middleware());
          break;
        case 'POST':
          app.post(route.path, Handler.middleware());
          break;
        case 'PUT':
          app.put(route.path, Handler.middleware());
          break;
        case 'DELETE':
          app.delete(route.path, Handler.middleware());
          break;
        case 'PATCH':
          app.patch(route.path, Handler.middleware());
          break;
        default:
          app.get(route.path, Handler.middleware());
          break;
      }
    });
  });
  app.use(Handler.middleware());
  return app;
};
