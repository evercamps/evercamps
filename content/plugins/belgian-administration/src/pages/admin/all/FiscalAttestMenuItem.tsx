import { NavigationItem } from '@components/admin/cms/NavigationItem';
import DocumentTextIcon from '@heroicons/react/solid/esm/DocumentTextIcon';
import React from 'react';

interface Props {
  fiscalAttestsUrl: string;
}

// "Fiscal attests" in the admin sidebar, inside the core Camp group: the
// group renders its items in an Area with the group's id (campMenuGroup), so
// plugins can add items there. Core's items have no sortOrder (0), so this
// comes after Participants / Registrations.
export default function FiscalAttestMenuItem({ fiscalAttestsUrl }: Props) {
  return <NavigationItem Icon={DocumentTextIcon} url={fiscalAttestsUrl} title="Fiscal attests" />;
}

export const layout = {
  areaId: 'campMenuGroup',
  sortOrder: 30
};

export const query = `
  query Query {
    fiscalAttestsUrl: url(routeId: "fiscalAttests")
  }
`;
