import { NavigationItemGroup } from '@components/admin/cms/NavigationItemGroup';
import UsersIcon from '@heroicons/react/solid/esm/UsersIcon';
import PropTypes from 'prop-types';
import React from 'react';
import participantGrid from 'src/modules/customer/pages/admin/participantGrid/index.js';

export default function CampsMenuGroup({ participantGrid }) {
  return (
    <NavigationItemGroup
      id="campsMenuGroup"
      name="Camps"
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

CampsMenuGroup.propTypes = {
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
