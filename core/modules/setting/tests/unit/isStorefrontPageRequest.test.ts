import { describe, expect, it } from '@jest/globals';
import {
  isStorefrontPageRequest,
  isSwitchedOn
} from '../../services/isStorefrontPageRequest.js';

describe('isStorefrontPageRequest', () => {
  it('hides storefront pages', () => {
    expect(isStorefrontPageRequest({ id: 'homepage' }, '/')).toBe(true);
    expect(
      isStorefrontPageRequest({ id: 'productView' }, '/product/abc')
    ).toBe(true);
    expect(isStorefrontPageRequest({ id: 'checkout' }, '/checkout')).toBe(
      true
    );
    expect(isStorefrontPageRequest({ id: 'login' }, '/account/login')).toBe(
      true
    );
  });

  it('never hides admin pages', () => {
    expect(
      isStorefrontPageRequest(
        { id: 'productGrid', isAdmin: true },
        '/admin/products'
      )
    ).toBe(false);
  });

  it('never hides API routes, so payment webhooks keep working', () => {
    expect(
      isStorefrontPageRequest(
        { id: 'mollieWebhook', isApi: true },
        '/api/mollie/webhook'
      )
    ).toBe(false);
    expect(
      isStorefrontPageRequest(
        { id: 'stripeWebHook', isApi: true },
        '/api/stripe/webhook'
      )
    ).toBe(false);
  });

  it('never hides static assets', () => {
    expect(
      isStorefrontPageRequest({ id: 'staticAsset' }, '/assets/catalog/a.jpg')
    ).toBe(false);
  });

  it('hides storefront URLs that match no route', () => {
    expect(isStorefrontPageRequest(undefined, '/some-old-page')).toBe(true);
    expect(isStorefrontPageRequest(undefined, '/a/b/c')).toBe(true);
  });

  it('does not hide unmatched files, admin or API paths', () => {
    expect(isStorefrontPageRequest(undefined, '/homepage.js')).toBe(false);
    expect(isStorefrontPageRequest(undefined, '/storefrontOffline.css')).toBe(
      false
    );
    expect(isStorefrontPageRequest(undefined, '/eHot/homepage')).toBe(false);
    expect(
      isStorefrontPageRequest(undefined, '/abc.hot-update.json')
    ).toBe(false);
    expect(isStorefrontPageRequest(undefined, '/admin/unknown')).toBe(false);
    expect(isStorefrontPageRequest(undefined, '/api/unknown')).toBe(false);
  });

  it('only treats /admin and /api as prefixes on a path boundary', () => {
    expect(isStorefrontPageRequest(undefined, '/administration')).toBe(true);
    expect(isStorefrontPageRequest(undefined, '/apiary')).toBe(true);
  });
});

describe('isSwitchedOn', () => {
  it('is on for 1 and true', () => {
    for (const value of ['1', 1, 'true', 'TRUE', true]) {
      expect(isSwitchedOn(value)).toBe(true);
    }
  });

  it('is off for everything else', () => {
    for (const value of ['0', 0, '', null, undefined, false, 'yes']) {
      expect(isSwitchedOn(value)).toBe(false);
    }
  });
});
