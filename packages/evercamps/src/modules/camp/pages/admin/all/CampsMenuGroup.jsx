import { NavigationItemGroup } from '@components/admin/cms/NavigationItemGroup';
import UsersIcon from '@heroicons/react/solid/esm/UsersIcon';
import PropTypes from 'prop-types';
import React from 'react';
import participantGrid from 'src/modules/customer/pages/admin/participantGrid/index.js';

export default function CampMenuGroup({ participantGrid }) {
  return (
    <NavigationItemGroup
      id="campMenuGroup"
      name="Camp"
      items={[        
        {
          Icon: UsersIcon,
          url: participantGrid,
          title: 'Participants'
        }
      ]}
    />
  );
}

CampMenuGroup.propTypes = {
  participantGrid: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 40
};

export const query = `
  query Query {
    participantGrid: url(routeId:"participantGrid")
  }
`;
