import { NavigationItemGroup } from '@components/admin/cms/NavigationItemGroup';
import UsersIcon from '@heroicons/react/solid/esm/UsersIcon';
import React from 'react';

interface Props {
  participantGrid: string;
  registrationGrid: string;
  participantDuplicates: string;
}

export default function CampMenuGroup({
  participantGrid,
  registrationGrid,
  participantDuplicates
}: Props) {
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
        },
        {
          Icon: UsersIcon,
          url: participantDuplicates,
          title: 'Possible duplicates'
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
    participantDuplicates: url(routeId:"participantDuplicates")
  }
`;
