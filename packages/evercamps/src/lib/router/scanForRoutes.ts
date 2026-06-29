import { existsSync, readdirSync } from 'fs';
import { basename, dirname, join } from 'path';
import { jsonParse } from '../util/jsonParse.js';
import type { Route } from './Router.js';

type ScannedRoute = Omit<Route, 'isAdmin' | 'name'> & { name: string };

function startWith(str: string, prefix: string): boolean {
  return str.slice(0, prefix.length) === prefix;
}

function validateRoute(
  methods: string[],
  path: string,
  routePath: string
): boolean {
  if (methods.length === 0) {
    throw new Error(
      `Method is required. Please check the route defined at ${routePath}`
    );
  }
  const check = methods.find(
    (m) =>
      ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(m) === false
  );
  if (check !== undefined) {
    throw new Error(
      `Method ${check} is invalid. Please check the route defined at ${routePath}`
    );
  }
  if (startWith(path, '/') === false) {
    throw new Error(
      `Path ${path} must be started with '/'. Please check the route defined at ${routePath}`
    );
  }
  return true;
}

export function parseRoute(
  jsonPath: string,
  isAdmin = false,
  isApi = false
): ScannedRoute | null {
  const routeId = basename(dirname(jsonPath));
  if (/^[a-zA-Z]+$/.test(routeId) === false) {
    throw new Error(
      `Route folder ${routeId} is invalid. It must contains only characters.`
    );
  }
  const routeJson = jsonParse(jsonPath) as {
    methods?: string[];
    path?: string;
    name?: string;
    access?: string;
  };
  const methods = routeJson?.methods?.map((m) => m.toUpperCase()) ?? [];
  let routePath = routeJson?.path ?? '';

  if (validateRoute(methods, routePath, routePath) === true) {
    if (isApi === true) {
      routePath = `/api${routePath}`;
    }

    let payloadSchema: object | undefined;
    if (existsSync(join(dirname(jsonPath), 'payloadSchema.json'))) {
      payloadSchema = jsonParse(join(dirname(jsonPath), 'payloadSchema.json')) as object;
    }

    return {
      id: routeId,
      name: routeJson?.name ?? routeId,
      method: methods,
      path: routePath,
      isApi,
      folder: dirname(jsonPath),
      payloadSchema,
      access: routeJson?.access ?? 'private',
    };
  }

  return null;
}

export function scanForRoutes(
  path: string,
  isAdmin: boolean,
  isApi: boolean
): ScannedRoute[] {
  const scannedRoutes = readdirSync(path, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  return scannedRoutes
    .map((r) => {
      if (/^[A-Za-z.]+$/.test(r) === true) {
        if (existsSync(join(path, r, 'route.json'))) {
          return parseRoute(join(path, r, 'route.json'), isAdmin, isApi) ?? false;
        }
      }
      return false as const;
    })
    .filter((e): e is ScannedRoute => e !== false);
}
