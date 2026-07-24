import { Card } from '@components/admin/cms/Card';
import CreateAt from '@components/admin/customer/customerGrid/rows/CreateAt';
import CustomerNameRow from '@components/admin/customer/customerGrid/rows/CustomerName';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import { Checkbox } from '@components/form/fields/Checkbox';
import { Form } from '@components/form/Form';
import SortableHeader from '@components/grid/headers/Sortable';
import Pagination from '@components/grid/Pagination';
import BasicRow from '@components/grid/rows/BasicRow';
import StatusRow from '@components/grid/rows/StatusRow';
import Filter from '@components/list/Filter';
import { useAlertContext } from '@components/modal/Alert';
import axios from 'axios';
import React, { useState } from 'react';

interface FilterItem {
  key: string;
  operation: string;
  value: string;
}

interface CreatedAt {
  value: string;
  text: string;
}

interface Customer {
  customerId: number;
  uuid: string;
  fullName: string;
  email: string;
  status: number;
  createdAt: CreatedAt;
  editUrl: string;
  updateApi: string;
}

interface CustomerList {
  items: Customer[];
  total: number;
  currentFilters?: FilterItem[];
}

interface CustomerGridProps {
  customers: CustomerList;
}

interface ActionsProps {
  customers?: Customer[];
  selectedIds?: string[];
}

function Actions({
  customers = [],
  selectedIds = []
}: ActionsProps) {
  const { openAlert, closeAlert } = useAlertContext();

  const updateCustomers = async (status: number) => {
    const promises = customers
      .filter((customer) => selectedIds.includes(customer.uuid))
      .map((customer) =>
        axios.patch(customer.updateApi, {
          status
        })
      );

    await Promise.all(promises);

    window.location.reload();
  };

  const actions = [
    {
      name: 'Disable',
      onAction: () => {
        openAlert({
          heading: `Disable ${selectedIds.length} customers`,
          content: 'Are you sure?',
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Disable',
            onAction: async () => {
              await updateCustomers(0);
            },
            variant: 'critical',
            isLoading: false
          }
        });
      }
    },
    {
      name: 'Enable',
      onAction: () => {
        openAlert({
          heading: `Enable ${selectedIds.length} customers`,
          content: 'Are you sure?',
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Enable',
            onAction: async () => {
              await updateCustomers(1);
            },
            variant: 'critical',
            isLoading: false
          }
        });
      }
    }
  ];

  return (
    <tr>
      {selectedIds.length > 0 && (
        <td style={{ borderTop: 0 }} colSpan={100}>
          <div className="inline-flex border border-divider rounded justify-items-start">
            <a href="#" className="font-semibold pt-3 pb-3 pl-6 pr-6">
              {selectedIds.length} selected
            </a>

            {actions.map((action, i) => (
              <a
                key={i}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  action.onAction();
                }}
                className="font-semibold pt-3 pb-3 pl-6 pr-6 block border-l border-divider self-center"
              >
                <span>{action.name}</span>
              </a>
            ))}
          </div>
        </td>
      )}
    </tr>
  );
}

export default function CustomerGrid({
  customers: {
    items: customers,
    total,
    currentFilters = []
  }
}: CustomerGridProps) {
  const pageFilter = currentFilters.find(
    (filter) => filter.key === 'page'
  );

  const limitFilter = currentFilters.find(
    (filter) => filter.key === 'limit'
  );

  const page = pageFilter
    ? parseInt(pageFilter.value, 10)
    : 1;

  const limit = limitFilter
    ? parseInt(limitFilter.value, 10)
    : 20;

  const [selectedRows, setSelectedRows] = useState<string[]>([]);
    return (
    <Card>
      <Card.Session
        title={
          <Form submitBtn={false} id="customerGridFilter">
            <div className="flex gap-8 justify-center items-center">
              <Area
                id="customerGridFilter"
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <Field
                          type="text"
                          id="keyword"
                          name="keyword"
                          placeholder="Search"
                          value={
                            currentFilters.find(
                              (f) => f.key === 'keyword'
                            )?.value
                          }
                          onKeyPress={(
                            e: React.KeyboardEvent<HTMLInputElement>
                          ) => {
                            if (e.key === 'Enter') {
                              const url = new URL(
                                document.location.href
                              );

                              const keyword =
                                (
                                  document.getElementById(
                                    'keyword'
                                  ) as HTMLInputElement
                                )?.value;

                              if (keyword) {
                                url.searchParams.set(
                                  'keyword',
                                  keyword
                                );
                              } else {
                                url.searchParams.delete(
                                  'keyword'
                                );
                              }

                              window.location.href =
                                url.toString();
                            }
                          }}
                        />
                      )
                    },
                    sortOrder: 5
                  },
                  {
                    component: {
                      default: () => (
                        <Filter
                          options={[
                            {
                              label: 'Enabled',
                              value: '1',
                              onSelect: () => {
                                const url = new URL(
                                  document.location.href
                                );
                                url.searchParams.set(
                                  'status',
                                  '1'
                                );
                                window.location.href =
                                  url.toString();
                              }
                            },
                            {
                              label: 'Disabled',
                              value: '0',
                              onSelect: () => {
                                const url = new URL(
                                  document.location.href
                                );
                                url.searchParams.set(
                                  'status',
                                  '0'
                                );
                                window.location.href =
                                  url.toString();
                              }
                            }
                          ]}
                          selectedOption={
                            currentFilters.find(
                              (f) => f.key === 'status'
                            )?.value
                          }
                          title="Status"
                        />
                      )
                    },
                    sortOrder: 10
                  }
                ]}
                currentFilters={currentFilters}
              />
            </div>
          </Form>
        }
        actions={[
          {
            variant: 'interactive',
            name: 'Clear filter',
            onAction: () => {
              const url = new URL(
                document.location.href
              );
              url.search = '';
              window.location.href = url.href;
            }
          }
        ]}
      />

      <table className="listing sticky">
        <thead>
          <tr>
            <th className="align-bottom">
              <Checkbox
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRows(
                      customers.map((c) => c.uuid)
                    );
                  } else {
                    setSelectedRows([]);
                  }
                }}
              />
            </th>

            <Area
              id="customerGridHeader"
              noOuter
              coreComponents={[
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Full Name"
                        name="full_name"
                        currentFilters={
                          currentFilters
                        }
                      />
                    )
                  },
                  sortOrder: 10
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Email"
                        name="email"
                        currentFilters={
                          currentFilters
                        }
                      />
                    )
                  },
                  sortOrder: 15
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Status"
                        name="status"
                        currentFilters={
                          currentFilters
                        }
                      />
                    )
                  },
                  sortOrder: 20
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Created At"
                        name="created_at"
                        currentFilters={
                          currentFilters
                        }
                      />
                    )
                  },
                  sortOrder: 25
                }
              ]}
            />
          </tr>
        </thead>

        <tbody>
          <Actions
            customers={customers}
            selectedIds={selectedRows}
          />

          {customers.map((customer) => (
            <tr key={customer.customerId}>
              <td>
                <Checkbox
                  isChecked={selectedRows.includes(
                    customer.uuid
                  )}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows([
                        ...selectedRows,
                        customer.uuid
                      ]);
                    } else {
                      setSelectedRows(
                        selectedRows.filter(
                          (id) =>
                            id !== customer.uuid
                        )
                      );
                    }
                  }}
                />
              </td>

              <Area
                id="customerGridRow"
                row={customer}
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <CustomerNameRow                          
                          name={
                            customer.fullName
                          }
                          url={
                            customer.editUrl
                          }
                        />
                      )
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: ({
                        areaProps
                      }: {
                        areaProps: unknown;
                      }) => (
                        <BasicRow
                          id="email"
                          areaProps={
                            areaProps
                          }
                        />
                      )
                    },
                    sortOrder: 15
                  },
                  {
                    component: {
                      default: ({
                        areaProps
                      }: {
                        areaProps: unknown;
                      }) => (
                        <StatusRow
                          id="status"
                          areaProps={
                            areaProps
                          }
                        />
                      )
                    },
                    sortOrder: 20
                  },
                  {
                    component: {
                      default: () => (
                        <CreateAt
                          time={
                            customer.createdAt.text
                          }
                        />
                      )
                    },
                    sortOrder: 25
                  }
                ]}
              />
            </tr>
          ))}
        </tbody>
      </table>

      {customers.length === 0 && (
        <div className="flex w-full justify-center">
          There is no customer to display
        </div>
      )}

      <Pagination
        total={total}
        limit={limit}
        page={page}
      />
    </Card>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    customers(filters: $filters) {
      items {
        customerId
        uuid
        fullName
        email
        status
        createdAt {
          value
          text
        }
        editUrl
        updateApi
      }
      total
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
  filters: getContextValue('filtersFromUrl')
}`;