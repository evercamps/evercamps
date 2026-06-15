import SettingMenu from '@components/admin/setting/SettingMenu';
import { Card } from '@components/admin/cms/Card';
import { Form } from '@components/common/form/Form';
import { Field } from '@components/common/form/Field';
import Button from '@components/common/form/Button';
import Pagination from '@components/common/grid/Pagination';
import React from 'react';
import { toast } from 'react-toastify';

interface Filter {
  key: string;
  operation: string;
  value: string;
}

interface AdminUser {
  uuid: string;
  fullName: string;
  email: string;
  status: string;
  twofaEnabled: number;
  twofaDeadline: string | null;
  twofaEnableUrl: string;
  twofaExtendUrl: string;
}

interface Props {
  users: {
    items: AdminUser[];
    total: number;
    currentFilters?: Filter[];
  };
}

export default function AdminOverview({
  users: { items: users, total, currentFilters = [] },
}: Props) {
  const page = currentFilters.find((filter) => filter.key === 'page')
    ? parseInt(currentFilters.find((filter) => filter.key === 'page')!.value, 10)
    : 1;
  const limit = currentFilters.find((filter) => filter.key === 'limit')
    ? parseInt(
        currentFilters.find((filter) => filter.key === 'limit')!.value,
        10
      )
    : 20;
  const currentSearch = currentFilters.find((f) => f.key === 'full_name')?.value || '';

  const handleEnable2FA = async (url: string) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.success) {
        window.location.reload();
      } else {
        toast.error('Failed to enable 2FA');
      }
    } catch (err) {
      toast.error('Something went wrong while enabling 2FA');
      console.error(err);
    }
  };

  const handleExtend2FA = async (url: string) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.success) {
        window.location.reload();
      } else {
        toast.error('Failed to extend 2FA');
      }
    } catch (err) {
      toast.error('Something went wrong while extending 2FA');
      console.error(err);
    }
  };

  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-8 grid-flow-row">
        <div className="col-span-2">
          <SettingMenu />
        </div>

        <div className="col-span-4">
          <Card>
            <Card.Session title={
                <Form submitBtn={false} id="adminUserSearch">
                  <Field
                    type="text"
                    id="full_name"
                    name="full_name"
                    placeholder="Search by name"
                    value={currentSearch}
                    onKeyPress={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const url = new URL(document.location.href);
                        const name = (document.getElementById('full_name') as HTMLInputElement)?.value;
                        if (name) {
                          url.searchParams.set('full_name[operation]', 'like');
                          url.searchParams.set('full_name[value]', name);
                        } else {
                          url.searchParams.delete('full_name[operation]');
                          url.searchParams.delete('full_name[value]');
                        }
                        window.location.href = url.href;
                      }
                    }}
                  />
                </Form>
              }
              actions={[
                {
                  variant: 'interactive',
                  name: 'Clear search',
                  onAction: () => {
                    const url = new URL(document.location.href);
                    url.search = '';
                    window.location.href = url.href;
                  }
                }
              ] as any}
            />
            <table className="listing sticky">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>2FA Status</th>
                  <th>2FA Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uuid}>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>{user.twofaEnabled === 1 ? 'Enabled' : 'Disabled'}</td>
                    <td>{user.twofaDeadline ? new Date(parseInt(user.twofaDeadline, 10)).toLocaleDateString() : 'N/A'}</td>
                    <td>
                    {!user.twofaEnabled && (
                      <>
                        {!user.twofaDeadline ? (
                          <Button
                            title="Enable"
                            onAction={() => handleEnable2FA(user.twofaEnableUrl)}
                          />
                        ) : (
                          <Button
                            title="Extend"
                            onAction={() => handleExtend2FA(user.twofaExtendUrl)} />
                        )}
                      </>
                    )}
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="flex w-full justify-center p-4">
                No admin users to display.
              </div>
            )}
            <Pagination total={total} limit={limit} page={page} />
          </Card>
        </div>
      </div>
    </div>
  );
}

export const query = `
  query Query($filters: [FilterInput]) {
  users: adminUsers(filters: $filters) {
    total
    items {
      uuid
      fullName
      email
      status
      twofaEnabled
      twofaDeadline
      twofaEnableUrl
      twofaExtendUrl
    }
    currentFilters {
      key
      operation
      value
    }
  }
}
`;

export const variables = `
{
  filters: getContextValue("filtersFromUrl")
}
`;

export const layout = { areaId: "content", sortOrder: 20 };
