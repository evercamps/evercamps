import { NavigationItemGroup } from '@components/admin/cms/NavigationItemGroup';
import UsersIcon from '@heroicons/react/solid/esm/UsersIcon';
import PropTypes from 'prop-types';
import React from 'react';
import participantGrid from 'src/modules/customer/pages/admin/participantGrid/index.js';
import registrationGrid from '../registrationGrid/index.js';

export default function CampMenuGroup({ participantGrid, registrationGrid }) {
  return (
    <NavigationItemGroup
      id="campMenuGroup"
      name="Camp"
      items={[        
        {
          Icon: UsersIcon,
          url: participantGrid,
          title: 'Participants'
        },
        {
          Icon: UsersIcon,
          url: registrationGrid,
          title: 'Registrations'
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
    registrationGrid: url(routeId:"registrationGrid")
  }
`;
