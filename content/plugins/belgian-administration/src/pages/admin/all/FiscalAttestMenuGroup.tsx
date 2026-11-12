import { NavigationItemGroup } from '@components/admin/cms/NavigationItemGroup';
import DocumentTextIcon from '@heroicons/react/solid/esm/DocumentTextIcon';
import React from 'react';

interface Props {
  fiscalAttestsUrl: string;
}

// Admin menu: "Fiscal attests" (281.86). The core Camp menu group has a fixed
// item list, so the plugin adds its own group.
export default function FiscalAttestMenuGroup({ fiscalAttestsUrl }: Props) {
  return (
    <NavigationItemGroup
      id="fiscalAttestMenuGroup"
      name="Fiscal attests"
      items={[
        {
          Icon: DocumentTextIcon,
          url: fiscalAttestsUrl,
          title: 'Attests per year'
        }
      ]}
    />
  );
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 45
};

export const query = `
  query Query {
    fiscalAttestsUrl: url(routeId: "fiscalAttests")
  }
`;
