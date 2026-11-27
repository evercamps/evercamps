import { translate } from '../../../lib/locale/translate/translate.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getAdminUserFromCookie } from '../../auth/services/getAdminUserFromCookie.js';
import {
  isStorefrontPageRequest,
  isSwitchedOn
} from './isStorefrontPageRequest.js';
import { renderOfflinePage } from './renderOfflinePage.js';
import { getSetting } from './setting.js';

/** Seconds a client is told to wait before trying again (`Retry-After`). */
const RETRY_AFTER_SECONDS = 3600;

/** Reads the "storefront offline" switch from the store settings. */
export async function isStorefrontOffline(): Promise<boolean> {
  return isSwitchedOn(await getSetting<unknown>('storefrontOffline', 0));
}

/**
 * App-level middleware: when the storefront is offline, a storefront page
 * request from someone who isn't a logged-in admin user is answered with
 * one standalone offline page (HTTP 503). The request ends here, so none of
 * the storefront's own middlewares, layout or menus run.
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
    const [storeName, title, message] = await Promise.all([
      getSetting<string>('storeName', ''),
      getSetting<string>('storefrontOfflineTitle', ''),
      getSetting<string>('storefrontOfflineMessage', '')
    ]);
    const html = renderOfflinePage({
      language: getConfig('shop.language', 'en'),
      storeName: storeName || '',
      title: title || translate('We are almost ready'),
      message:
        message ||
        translate('Our shop is not available yet. Please come back soon.'),
      logoSrc: getConfig('themeConfig.logo.src', null)
    });
    response.status(503);
    response.set('Retry-After', String(RETRY_AFTER_SECONDS));
    response.set('X-Robots-Tag', 'noindex');
    response.set('Cache-Control', 'no-store');
    response.type('html').send(html);
  } catch (e) {
    next(e);
  }
}
