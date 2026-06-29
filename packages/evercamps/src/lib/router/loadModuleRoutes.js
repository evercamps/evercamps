import { existsSync } from 'fs';
import path from 'path';
import { registerAdminRoute } from './registerAdminRoute.js';
import { registerFrontStoreRoute } from './registerFrontStoreRoute.js';
import { scanForRoutes } from './scanForRoutes.js';

export const loadModuleRoutes = (modulePath) => {
    // Check for routes
    if (existsSync(path.resolve(modulePath, 'pages', 'admin'))) {
      const adminControllerRoutes = scanForRoutes(
        path.resolve(modulePath, 'pages', 'admin'),
        true,
        false
      );
      adminControllerRoutes.forEach((route) => {
        registerAdminRoute(
          route.id,
          route.method,
          route.path,
          route.name,
          route.isApi,
          route.folder
        );
      });
    }

    if (existsSync(path.resolve(modulePath, 'pages', 'frontStore'))) {
      const frontStoreControllerRoutes = scanForRoutes(
        path.resolve(modulePath, 'pages', 'frontStore'),
        false,
        false
      );
      frontStoreControllerRoutes.forEach((route) => {
        registerFrontStoreRoute(
          route.id,
          route.method,
          route.path,
          route.name,
          route.isApi,
          route.folder
        );
      });
    }

    // Wiwth API, we do not have admin and frontStore folders
    const manifestPath = resolve(modulePath, 'api', 'routes.ts');
    if (existsSync(manifestPath)) {
      const { routes } = await import(pathToFileURL(manifestPath));
      await loadFromManifest(modulePath, routes);
    } else if (existsSync(path.resolve(modulePath, 'api'))) {
      const routes = scanForRoutes(path.resolve(modulePath, 'api'), false, true);
      routes.forEach((route) => {
        registerFrontStoreRoute(
          route.id,
          route.method,
          route.path,
          route.name,
          route.isApi,
          route.folder,
          route.payloadSchema,
          route.access
        );
      });
    }
};

async function loadFromManifest(modulePath, routeDefs) {
  for (const routeDef of routeDefs) {
    // 1. Register route metadata (replaces scanForRoutes + route.json)
    if (routeDef.region === 'api' && routeDef.path && routeDef.routeId) {
      registerFrontStoreRoute(
        String(routeDef.routeId),
        routeDef.methods,
        '/api' + routeDef.path,
        String(routeDef.routeId),
        true,
        resolve(modulePath, 'api', String(routeDef.routeId)),
        null,
        routeDef.access ?? 'private'
      );
    }

    // 2. Register middleware with explicit ordering (replaces parseFromFile)
    const folder = routeFolder(modulePath, routeDef);
    for (const mw of routeDef.middleware) {
      const filePath = findMiddlewareFile(folder, mw.id); // finds mw.id.ts or mw.id.js
      addMiddleware({
        id: mw.id,
        middleware: buildMiddlewareFunction(mw.id, filePath),
        after: mw.after,
        before: mw.before,
        routeId: routeDef.routeId,
        region: routeDef.region,
        scope: routeDef.routeId ?? 'app',
      });
    }
  }
}
