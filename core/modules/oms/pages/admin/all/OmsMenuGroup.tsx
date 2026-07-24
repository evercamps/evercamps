import React from 'react';
import { NavigationItemGroup } from '@components/admin/cms/NavigationItemGroup';
import Icon from '@heroicons/react/solid/esm/CubeIcon';
import UsersIcon from '@heroicons/react/solid/esm/UsersIcon';

interface OmsMenuGroupProps {
  orderGrid: string;
  customerGrid: string;
}

export default function OmsMenuGroup({
  orderGrid,
  customerGrid
}: OmsMenuGroupProps) {
  return (
    <NavigationItemGroup
      id="omsMenuGroup"
      name="Sale"
      items={[
        {
          Icon,
          url: orderGrid,
          title: 'Orders'
        },
        {
          Icon: UsersIcon,
          url: customerGrid,
          title: 'Customers'
        }
      ]}
    />
  );
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 30
};

export const query = `
  query Query {
    orderGrid: url(routeId:"orderGrid")
    customerGrid: url(routeId:"customerGrid")
  }
`;