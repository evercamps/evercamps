import { existsSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { RouteDefinition } from '../middleware/types.js';
import { jsonParse } from '../util/jsonParse.js';
import { registerAdminRoute } from './registerAdminRoute.js';
import { registerFrontStoreRoute } from './registerFrontStoreRoute.js';
import { scanForRoutes } from './scanForRoutes.js';

export const loadModuleRoutes = async (modulePath: string): Promise<void> => {
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

  // API routes do not have admin and frontStore subfolders
  if (existsSync(path.resolve(modulePath, 'api'))) {
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

    // API routes declared in routes.ts (path + methods) instead of route.json
    const routesJsPath = path.resolve(modulePath, 'api', 'routes.js');
    if (existsSync(routesJsPath)) {
      const registered = new Set(routes.map((r) => r.id));
      const { routes: routeDefs } = (await import(
        pathToFileURL(routesJsPath).href
      )) as { routes: RouteDefinition[] };
      for (const def of routeDefs) {
        if (
          def.region !== 'api' ||
          typeof def.routeId !== 'string' ||
          !def.path ||
          !def.methods?.length ||
          registered.has(def.routeId)
        ) {
          continue;
        }
        if (!def.path.startsWith('/')) {
          throw new Error(
            `Path ${def.path} must be started with '/'. Please check the route ${def.routeId} defined at ${routesJsPath}`
          );
        }
        const folder = path.resolve(modulePath, 'api', def.routeId);
        const schemaPath = path.resolve(folder, 'payloadSchema.json');
        registerFrontStoreRoute(
          def.routeId,
          def.methods.map((m) => m.toUpperCase()),
          `/api${def.path}`,
          def.routeId,
          true,
          folder,
          existsSync(schemaPath) ? (jsonParse(schemaPath) as object) : null,
          def.access ?? 'private'
        );
      }
    }
  }
};
