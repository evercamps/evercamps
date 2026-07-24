import Area from '@components/Area';
import EmailIcon from '@heroicons/react/outline/MailIcon';
import User from '@heroicons/react/outline/UserIcon';
import React from 'react';

interface Account {
  email: string;
  fullName: string;
}

interface AccountDetailsProps {
  account: Account;
}

export default function AccountDetails({
  account
}: AccountDetailsProps): React.ReactElement {
  return (
    <div className="account-details">
      <div className="account-details-inner">
        <div className="grid grid-cols-1 gap-4">
          <Area
            id="accountDetails"
            coreComponents={[
              {
                component: {
                  default: () => (
                    <div className="account-details-name flex gap-4">
                      <div>
                        <User width={20} height={20} />
                      </div>
                      <div>{account.fullName}</div>
                    </div>
                  )
                },
                sortOrder: 10
              },
              {
                component: {
                  default: () => (
                    <div className="account-details-email flex gap-4">
                      <div>
                        <EmailIcon width={20} height={20} />
                      </div>
                      <div>{account.email}</div>
                    </div>
                  )
                },
                sortOrder: 15
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'accountPageInfo',
  sortOrder: 10
};

export const query = `
  query Query {
    account: currentCustomer {
      uuid
      fullName
      email
    }
  }
`;