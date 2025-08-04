import { NavigationItemGroup } from '@components/admin/cms/NavigationItemGroup';
import Icon from '@heroicons/react/solid/esm/CubeIcon';
import UsersIcon from '@heroicons/react/solid/esm/UsersIcon';
import PropTypes from 'prop-types';
import React from 'react';
import customerGrid from 'src/modules/customer/pages/admin/customerGrid/index.js';

export default function OmsMenuGroup({ orderGrid, customerGrid }) {
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

OmsMenuGroup.propTypes = {
  orderGrid: PropTypes.string.isRequired,
  customerGrid: PropTypes.string.isRequired
};

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
