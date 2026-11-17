import { NavigationItem } from '@components/admin/cms/NavigationItem';
import MailIcon from '@heroicons/react/solid/esm/MailIcon';
import React from 'react';

interface Props {
  emailLogGridUrl: string;
}

// "Email log" in the Sale group of the admin sidebar
export default function EmailLogMenuItem({ emailLogGridUrl }: Props) {
  return <NavigationItem Icon={MailIcon} url={emailLogGridUrl} title="Email log" />;
}

export const layout = {
  areaId: 'omsMenuGroup',
  sortOrder: 30
};

export const query = `
  query Query {
    emailLogGridUrl: url(routeId: "emailLogGrid")
  }
`;
