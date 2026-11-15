import { Card } from '@components/admin/cms/Card';
import React from 'react';

interface Props {
  wooCommerceLineMappingUrl: string;
}

export default function WooCommerceLineMappingMenu({ wooCommerceLineMappingUrl }: Props) {
  return (
    <Card.Session title={<a href={wooCommerceLineMappingUrl}>WooCommerce: unmapped order lines</a>}>
      <div>Map imported order lines without a variant to a product variant</div>
    </Card.Session>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 16
};

export const query = `
  query Query {
    wooCommerceLineMappingUrl: url(routeId: "wooCommerceLineMapping")
  }
`;
