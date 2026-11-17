import { Card } from '@components/admin/cms/Card';
import React from 'react';

interface Props {
  emailSettingUrl: string;
}

export default function EmailSettingMenu({ emailSettingUrl }: Props) {
  return (
    <Card.Session title={<a href={emailSettingUrl}>Email Setting</a>}>
      <div>Configure sending emails (SMTP) and the email log</div>
    </Card.Session>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 30
};

export const query = `
  query Query {
    emailSettingUrl: url(routeId: "emailSetting")
  }
`;
