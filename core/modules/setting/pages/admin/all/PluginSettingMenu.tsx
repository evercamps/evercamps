import { Card } from '@components/admin/cms/Card';
import React from 'react';

interface Props {
  pluginManagementUrl: string;
}

export default function PluginSettingMenu({ pluginManagementUrl }: Props) {
  return (
    <Card.Session title={<a href={pluginManagementUrl}>Plugin Management</a>}>
      <div>Activate or deactivate registered plugins</div>
    </Card.Session>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 20
};

export const query = `
  query Query {
    pluginManagementUrl: url(routeId: "pluginManagement")
  }
`;
