import { getRoutes } from '../../../lib/router/Router.js';
import { getAdminUserFromCookie } from '../../auth/services/getAdminUserFromCookie.js';
import {
  isStorefrontPageRequest,
  isSwitchedOn,
  type RouteLike
} from './isStorefrontPageRequest.js';
import { getSetting } from './setting.js';

export const STOREFRONT_OFFLINE_ROUTE_ID = 'storefrontOffline';

/** Seconds a client is told to wait before trying again (`Retry-After`). */
const RETRY_AFTER_SECONDS = 3600;

/** Reads the "storefront offline" switch from the store settings. */
export async function isStorefrontOffline(): Promise<boolean> {
  return isSwitchedOn(await getSetting<unknown>('storefrontOffline', 0));
}

/**
 * App-level middleware: when the storefront is offline, a storefront page
 * request from someone who isn't a logged-in admin user is answered by the
 * offline page with HTTP 503. It swaps the current route before the
 * route's own middlewares are chosen, so none of the original page's
 * middlewares (cart, checkout, product loading, redirects) run.
 */
export async function storefrontOfflineMiddleware(
  request: any,
  response: any,
  next: (error?: unknown) => void
): Promise<void> {
  // The framework's middleware tests run without a database.
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }
  try {
    const path = request.originalUrl.split('?')[0];
    if (!isStorefrontPageRequest(request.currentRoute, path)) {
      next();
      return;
    }
    if (!(await isStorefrontOffline())) {
      next();
      return;
    }
    if (await getAdminUserFromCookie(request)) {
      next();
      return;
    }
    const offlineRoute = getRoutes().find(
      (r: RouteLike) => r.id === STOREFRONT_OFFLINE_ROUTE_ID
    );
    if (!offlineRoute) {
      next();
      return;
    }
    request.currentRoute = offlineRoute;
    response.status(503);
    response.set('Retry-After', String(RETRY_AFTER_SECONDS));
    response.set('X-Robots-Tag', 'noindex');
    next();
  } catch (e) {
    next(e);
  }
}
