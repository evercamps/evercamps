import SettingMenu from '@components/admin/setting/SettingMenu';
import { Card } from '@components/admin/cms/Card';
import { Form } from '@components/common/form/Form';
import { Field } from '@components/common/form/Field';
import Pagination from '@components/common/grid/Pagination';
import PropTypes from 'prop-types';
import React from 'react';

export default function AdminOverview({
  users: { items: users, total, currentFilters = [] },
}) {
  const page = currentFilters.find((filter) => filter.key === 'page')
    ? parseInt(currentFilters.find((filter) => filter.key === 'page').value, 10)
    : 1;
  const limit = currentFilters.find((filter) => filter.key === 'limit')
    ? parseInt(
        currentFilters.find((filter) => filter.key === 'limit').value,
        10
      )
    : 20;
  const currentSearch = currentFilters.find((f) => f.key === 'full_name')?.value || '';

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
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const url = new URL(document.location);
                        const name = document.getElementById('full_name')?.value;
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
                    const url = new URL(document.location);
                    url.search = '';
                    window.location.href = url.href;
                  }
                }
              ]}
            />
            <table className="listing sticky">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>2FA Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uuid}>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>{user.twofaEnabled === 1 ? 'Enabled' : 'Disabled'}</td>
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

AdminOverview.propTypes = {
  users: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        uuid: PropTypes.string.isRequired,
        fullName: PropTypes.string.isRequired,
        email: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
  total: PropTypes.number.isRequired,
  currentFilters: PropTypes.array,
};

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
