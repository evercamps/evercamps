import { NavigationItemGroup } from '@components/admin/cms/NavigationItemGroup';
import CogIcon from '@heroicons/react/solid/esm/CogIcon';
import React from 'react';

interface Props {
  storeSetting: string;
}

export default function CmsMenuGroup({ storeSetting }: Props) {
  return (
    <NavigationItemGroup
      id="settingMenuGroup"
      name="Setting"
      Icon={() => <CogIcon width={15} height={15} />}
      url={storeSetting}
    />
  );
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 500
};

export const query = `
  query Query {
    storeSetting: url(routeId:"storeSetting")
  }
`;
