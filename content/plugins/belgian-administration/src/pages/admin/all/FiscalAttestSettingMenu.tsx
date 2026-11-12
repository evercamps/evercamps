import { Card } from '@components/admin/cms/Card';
import React from 'react';

interface Props {
  fiscalAttestSettingsUrl: string;
}

export default function FiscalAttestSettingMenu({ fiscalAttestSettingsUrl }: Props) {
  return (
    <Card.Session title={<a href={fiscalAttestSettingsUrl}>Fiscal attests</a>}>
      <div>Organiser, recognition and Belcotax settings for fiscal attests (281.86)</div>
    </Card.Session>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 20
};

export const query = `
  query Query {
    fiscalAttestSettingsUrl: url(routeId: "fiscalAttestSettings")
  }
`;
