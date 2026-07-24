import Icon from '@heroicons/react/outline/UserIcon';
import React from 'react';

interface UserIconProps {
  customer?: {
    email: string;
    fullName: string;
    uuid: string;
  } | null;
  accountUrl?: string | null;
  loginUrl: string;
}

export default function UserIcon({
  customer = null,
  accountUrl = null,
  loginUrl
}: UserIconProps) {
  return (
    <div className="self-center">
      <a href={customer ? accountUrl ?? '#' : loginUrl}>
        <Icon width={25} height={25} />
      </a>
    </div>
  );
}

export const layout = {
  areaId: 'icon-wrapper',
  sortOrder: 30
};

export const query = `
  query Query {
    customer: currentCustomer {
      uuid
      fullName
      email
    }
    accountUrl: url(routeId: "account")
    loginUrl: url(routeId: "login")
  }
`;