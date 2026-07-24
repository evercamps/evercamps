import Area from '@components/Area';
import React from 'react';
import { toast } from 'react-toastify';

import { _ } from '../../../../../lib/locale/translate/_.js';

interface LayoutProps {
  logoutUrl: string;
}

interface LogoutResponse {
  error?: {
    message: string;
  };
}

export default function Layout({ logoutUrl }: LayoutProps) {
  const logout = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    const response = await fetch(logoutUrl, {
      method: 'GET'
    });

    const data = (await response.json()) as LogoutResponse;

    if (data.error) {
      toast.error(data.error.message);
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div>
      <h1 className="text-center">{_('My Account')}</h1>

      <div className="page-width mt-12 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="col-span-1 md:col-span-2">
          <div className="border-b mb-8 border-textSubdued">
            <h2>{_('Order History')}</h2>
          </div>
          <Area id="accountPageOrderHistory" noOuter />
        </div>

        <div className="col-span-1">
          <div className="border-b mb-8 flex justify-between items-center border-textSubdued">
            <h2>{_('Account Details')}</h2>
            <a
              className="text-interactive"
              href="#"
              onClick={logout}
            >
              {_('Logout')}
            </a>
          </div>

          <Area id="accountPageInfo" noOuter />
        </div>
      </div>

      <div className="page-width mt-12">
        <div className="border-b mb-8 border-textSubdued">
          <h2>{_('Address Book')}</h2>
        </div>
        <Area id="accountPageAddressBook" noOuter />
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    logoutUrl: url(routeId: "customerLogoutJson")
  }
`;