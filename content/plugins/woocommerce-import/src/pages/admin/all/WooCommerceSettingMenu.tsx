import { Card } from '@components/admin/cms/Card';
import React from 'react';

interface Props {
  wooCommerceSettingsUrl: string;
}

export default function WooCommerceSettingMenu({ wooCommerceSettingsUrl }: Props) {
  return (
    <Card.Session title={<a href={wooCommerceSettingsUrl}>WooCommerce Import</a>}>
      <div>Configure the WooCommerce connection and import products</div>
    </Card.Session>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 15
};

export const query = `
  query Query {
    wooCommerceSettingsUrl: url(routeId: "wooCommerceSettings")
  }
`;
