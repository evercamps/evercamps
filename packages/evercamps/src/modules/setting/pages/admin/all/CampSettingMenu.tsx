import { Card } from '@components/admin/cms/Card';
import React from 'react';

interface Props {
  campSettingUrl: string;
}

export default function CampSettingMenu({ campSettingUrl }: Props) {
  return (
    <Card.Session title={<a href={campSettingUrl}>Camp Setting</a>}>
      <div>Configure camps and participant options</div>
    </Card.Session>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 15
};

export const query = `
  query Query {
    campSettingUrl: url(routeId: "campSetting")
  }
`;
