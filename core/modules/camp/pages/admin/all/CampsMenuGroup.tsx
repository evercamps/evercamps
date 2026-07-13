import { NavigationItemGroup } from '@components/admin/cms/NavigationItemGroup';
import UsersIcon from '@heroicons/react/solid/esm/UsersIcon';
import React from 'react';

interface Props {
  participantGrid: string;
  registrationGrid: string;
}

export default function CampMenuGroup({ participantGrid, registrationGrid }: Props) {
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
