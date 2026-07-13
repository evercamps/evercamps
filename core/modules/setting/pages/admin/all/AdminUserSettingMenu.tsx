import { Card } from '@components/admin/cms/Card';
import React from 'react';

interface Props {
  adminOverviewUrl: string;
}

export default function AdminUserSettingMenu({ adminOverviewUrl }: Props) {
  return (
    <Card.Session title={<a href={adminOverviewUrl}>Admin Users</a>}>
      <div>Overview of Admin Users</div>
    </Card.Session>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 25
};

export const query = `
  query Query {
    adminOverviewUrl: url(routeId: "adminOverview")
  }
`;
