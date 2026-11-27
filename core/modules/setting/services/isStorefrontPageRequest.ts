export interface RouteLike {
  id: string;
  isAdmin?: boolean;
  isApi?: boolean;
}

/**
 * Whether a request is for a storefront page, i.e. something the offline
 * storefront hides. Admin pages, API routes (including payment webhooks),
 * static assets and webpack/dev files are never hidden.
 *
 * @param route the matched route, or undefined when no route matched (a
 * storefront URL that doesn't exist, or a build/dev file)
 * @param path the request path without query string
 */
export function isStorefrontPageRequest(
  route: RouteLike | undefined,
  path: string
): boolean {
  if (route) {
    return !route.isAdmin && !route.isApi && route.id !== 'staticAsset';
  }
  // No route matched: a missing storefront page is hidden, but files served
  // further down the chain (bundles, hot updates) are not.
  if (
    path === '/admin' ||
    path.startsWith('/admin/') ||
    path === '/api' ||
    path.startsWith('/api/')
  ) {
    return false;
  }
  if (path.includes('/eHot/') || path.includes('.hot-update')) {
    return false;
  }
  const lastSegment = path.split('/').pop() || '';
  return !lastSegment.includes('.');
}

/** A setting saved by a Toggle: '1'/1/'true'/true is on, anything else off. */
export function isSwitchedOn(value: unknown): boolean {
  return String(value) === '1' || String(value).toLowerCase() === 'true';
}
