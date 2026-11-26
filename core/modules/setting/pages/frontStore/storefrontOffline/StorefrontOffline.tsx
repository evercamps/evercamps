import Area from '@components/Area';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';
import './StorefrontOffline.scss';

interface Logo {
  src?: string | null;
  alt?: string | null;
}

interface Props {
  setting: {
    storeName?: string | null;
    storefrontOfflineTitle?: string | null;
    storefrontOfflineMessage?: string | null;
  };
  themeConfig: { logo: Logo };
}

function OfflineLogo({ logo, storeName }: { logo: Logo; storeName: string }) {
  if (!logo?.src) {
    return null;
  }
  return (
    <div className="storefront-offline-logo flex justify-center mb-8">
      <img src={logo.src} alt={logo.alt || storeName} />
    </div>
  );
}

function OfflineTitle({ title }: { title: string }) {
  return <h1 className="text-center mb-4">{title}</h1>;
}

function OfflineMessage({ message }: { message: string }) {
  return (
    <div className="text-center text-textSubdued whitespace-pre-line">
      {message}
    </div>
  );
}

/**
 * The page visitors see while the storefront is offline. A theme can add to
 * or replace its parts through the `storefront-offline-page` area, or
 * override this whole component in `pages/storefrontOffline/`.
 */
export default function StorefrontOffline({ setting, themeConfig }: Props) {
  const title = setting.storefrontOfflineTitle || _('We are almost ready');
  const message =
    setting.storefrontOfflineMessage ||
    _('Our shop is not available yet. Please come back soon.');
  return (
    <div className="storefront-offline page-width">
      <Area
        id="storefront-offline-page"
        noOuter
        coreComponents={[
          {
            component: { default: OfflineLogo },
            props: { logo: themeConfig?.logo, storeName: setting.storeName || '' },
            sortOrder: 10,
            id: 'storefront-offline-logo'
          },
          {
            component: { default: OfflineTitle },
            props: { title },
            sortOrder: 20,
            id: 'storefront-offline-title'
          },
          {
            component: { default: OfflineMessage },
            props: { message },
            sortOrder: 30,
            id: 'storefront-offline-message'
          }
        ]}
      />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      storeName
      storefrontOfflineTitle
      storefrontOfflineMessage
    }
    themeConfig {
      logo {
        src
        alt
      }
    }
  }
`;
