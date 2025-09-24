import { Card } from '@components/admin/cms/Card';
import PropTypes from 'prop-types';
import React from 'react';

export default function AdminUserSettingMenu({ adminOverviewUrl }) {
  return (
    <Card.Session title={<a href={adminOverviewUrl}>Admin Users</a>}>
      <div>Overview of Admin Users</div>
    </Card.Session>
  );
}

AdminUserSettingMenu.propTypes = {
  adminOverviewUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 25
};

export const query = `
  query Query {
    adminOverviewUrl: url(routeId: "adminOverview")
  }
`;
