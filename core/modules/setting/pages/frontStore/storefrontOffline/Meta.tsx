import Meta from '@components/Meta';
import Title from '@components/Title';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface Props {
  setting: { storefrontOfflineTitle?: string | null };
}

export default function StorefrontOfflineMeta({ setting }: Props) {
  return (
    <>
      <Title title={setting.storefrontOfflineTitle || _('We are almost ready')} />
      <Meta name="robots" content="noindex" />
    </>
  );
}

export const layout = {
  areaId: 'head',
  sortOrder: 1
};

export const query = `
  query Query {
    setting {
      storefrontOfflineTitle
    }
  }
`;
