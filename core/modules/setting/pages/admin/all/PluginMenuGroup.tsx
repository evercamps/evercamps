import { NavigationItemGroup } from '@components/admin/cms/NavigationItemGroup';
import ChipIcon from '@heroicons/react/solid/esm/ChipIcon';
import React from 'react';

interface Props {
  pluginManagementUrl: string;
}

export default function PluginMenuGroup({ pluginManagementUrl }: Props) {
  return (
    <NavigationItemGroup
      id="pluginMenuGroup"
      name="Plugins"
      items={[
        {
          Icon: ChipIcon,
          url: pluginManagementUrl,
          title: 'Installed plugins'
        }
      ]}
    />
  );
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 70
};

export const query = `
  query Query {
    pluginManagementUrl: url(routeId: "pluginManagement")
  }
`;
