import { NavigationItem } from '@components/admin/cms/NavigationItem';
import ChatIcon from '@heroicons/react/solid/esm/ChatAltIcon';
import React from 'react';

interface Props {
  contactMessageGridUrl: string;
}

// "Contact messages" in the CMS group of the admin sidebar
export default function ContactMessageMenuItem({ contactMessageGridUrl }: Props) {
  return (
    <NavigationItem Icon={ChatIcon} url={contactMessageGridUrl} title="Contact messages" />
  );
}

export const layout = {
  areaId: 'cmsMenuGroup',
  sortOrder: 30
};

export const query = `
  query Query {
    contactMessageGridUrl: url(routeId: "contactMessageGrid")
  }
`;
