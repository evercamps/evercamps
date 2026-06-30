import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { addMiddleware } from './addMiddleware.js';
import { Handler } from './Handler.js';
import { scanForMiddlewareFunctions } from './scanForMiddlewareFunctions.js';
import { sortMiddlewares } from './sort.js';

const middlewareList = Handler.middlewares;

export function getAdminMiddlewares(routeId) {
  return sortMiddlewares(
    middlewareList.filter(
      (m) =>
        m.routeId === 'admin' || m.routeId === routeId || m.routeId === null
    )
  );
}

export function getFrontMiddlewares(routeId) {
  return sortMiddlewares(
    middlewareList.filter(
      (m) =>
        m.routeId === 'frontStore' ||
        m.routeId === routeId ||
        m.routeId === null
    )
  );
}

/**
 * This function scan and load all middleware function of a module base on module path
 *
 * @param   {string}  path  The path of the module
 *
 */
export async function getModuleMiddlewares(path) {
  if (existsSync(resolve(path, 'pages'))) {
    // Scan for the application level middleware
    if (existsSync(resolve(path, 'pages', 'global'))) {
      scanForMiddlewareFunctions(resolve(path, 'pages', 'global')).forEach(
        (m) => {
          addMiddleware(m);
        }
      );
    }
    // Scan for the admin level middleware
    if (existsSync(resolve(path, 'pages', 'admin'))) {
      const routes = readdirSync(resolve(path, 'pages', 'admin'), {
        withFileTypes: true
      })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
      routes.forEach((route) => {
        scanForMiddlewareFunctions(
          resolve(path, 'pages', 'admin', route)
        ).forEach((m) => {
          addMiddleware(m);
        });
      });
    }

    // Scan for the frontStore level middleware
    if (existsSync(resolve(path, 'pages', 'frontStore'))) {
      const routes = readdirSync(resolve(path, 'pages', 'frontStore'), {
        withFileTypes: true
      })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
      routes.forEach((route) => {
        scanForMiddlewareFunctions(
          resolve(path, 'pages', 'frontStore', route)
        ).forEach((m) => {
          addMiddleware(m);
        });
      });
    }
  }

  // Scan for the api middleware
  if (existsSync(resolve(path, 'api'))) {
    const routesJsPath = resolve(path, 'api', 'routes.js');

    if (existsSync(routesJsPath)) {
      // routes.ts-based: use explicit ordering from routes.js instead of filename defaults
      const { routes } = await import(pathToFileURL(routesJsPath).href);

      // Build ordering map keyed by "routeIdKey:middlewareId"
      const orderingMap = new Map();
      for (const routeDef of routes) {
        if (routeDef.region !== 'api') continue;
        const routeIdKey = routeDef.routeId === null
          ? 'null'
          : Array.isArray(routeDef.routeId)
            ? routeDef.routeId.join('+')
            : String(routeDef.routeId);
        for (const mEntry of routeDef.middleware) {
          orderingMap.set(`${routeIdKey}:${mEntry.id}`, mEntry);
        }
      }

      const apiDirs = readdirSync(resolve(path, 'api'), { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      apiDirs.forEach((routeDir) => {
        const routeIdKey = routeDir === 'global' ? 'null' : routeDir;
        scanForMiddlewareFunctions(resolve(path, 'api', routeDir)).forEach((m) => {
          const ordering = orderingMap.get(`${routeIdKey}:${m.id}`);
          if (ordering) {
            m.before = ordering.before;
            m.after = ordering.after;
          }
          addMiddleware(m);
        });
      });
    } else {
      const routes = readdirSync(resolve(path, 'api'), { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
      routes.forEach((route) => {
        scanForMiddlewareFunctions(resolve(path, 'api', route)).forEach((m) => {
          addMiddleware(m);
        });
      });
    }
  }
}

/**
 * This function return a list of sorted middleware functions (all)
 *
 * @return  {array}  List of sorted middleware functions
 */
export function getAllSortedMiddlewares() {
  return sortMiddlewares(middlewareList);
}
