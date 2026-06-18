import { Card } from '@components/admin/cms/Card';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';
import { Checkbox } from '@components/common/form/fields/Checkbox';
import { Form } from '@components/common/form/Form';
import SortableHeader from '@components/common/grid/headers/Sortable';
import Pagination from '@components/common/grid/Pagination';
import Filter from '@components/common/list/Filter';
import { useAlertContext } from '@components/common/modal/Alert';
import axios from 'axios';
import React, { useState } from 'react';
import * as XLSX from "xlsx";
import { GraphQLFilter } from '../../../../../types';

export const query = `
  query Query($filters: [FilterInput]) {
  registrations(filters: $filters) {
    total
    items {
      uuid
      name
      registrationId
      participant {
        firstName
        lastName
      }
      deleteApi
    }
    currentFilters {
      key
      operation
      value
    }
  }
  products {
    items {
      uuid
      name
    }
  }
}
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;

export const layout = { areaId: "content", sortOrder: 20 };

interface Registration {
  uuid: string;
  name: string;
  registrationId: number;
  participant: {
    firstName: string;
    lastName: string;
  };
  deleteApi: string;
}

interface Product {
  uuid: string;
  name: string;
}

interface ActionsProps {
  registrations: Registration[];
  selectedIds: string[];
}

function Actions({ registrations = [] as Registration[], selectedIds = [] as string[] }: ActionsProps) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const deleteRegistrations = async () => {
    setIsLoading(true);
    const promises = registrations
      .filter((registration) => selectedIds.includes(registration.uuid))
      .map((registration) => axios.delete(registration.deleteApi));
    await Promise.all(promises);
    setIsLoading(false);
    window.location.reload();
  };

  const actions = [
    {
      name: 'Delete',
      onAction: () => {
        openAlert({
          heading: `Delete ${selectedIds.length} registrations`,
          content: <div>Can&apos;t be undone</div>,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Delete',
            onAction: async () => {
              await deleteRegistrations();
            },
            variant: 'critical',
            isLoading
          }
        });
      }
    }
  ];

  return (
    <tr>
      {selectedIds.length === 0 && null}
      {selectedIds.length > 0 && (
        <td style={{ borderTop: 0 }} colSpan={100}>
          <div className="inline-flex border border-divider rounded justify-items-start">
            <a href="#" className="font-semibold pt-3 pb-3 pl-6 pr-6">
              {selectedIds.length} selected
            </a>
            {actions.map((action, index) => (
              <a
                key={index}
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

interface RegistrationGridProps {
  registrations: {
    items: Registration[];
    total: number;
    currentFilters: GraphQLFilter[];
  };
  products: {
    items: Product[];
  };
}

export default function RegistrationGrid({
  registrations: { items: registrations, total, currentFilters = [] },
  products: { items: products },
}: RegistrationGridProps) {
  const page = currentFilters.find((filter) => filter.key === 'page')
    ? parseInt(currentFilters.find((filter) => filter.key === 'page')!.value, 10)
    : 1;
  const limit = currentFilters.find((filter) => filter.key === 'limit')
    ? parseInt(
        currentFilters.find((filter) => filter.key === 'limit')!.value,
        10
      )
    : 20;
  const selectedValue = currentFilters.find((f) => f.key === 'product_uuid')?.value;
  const selectedOption = products.find((p) => p.uuid === selectedValue);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  return (
    <Card>
      <Card.Session
        title={
          <Form submitBtn={false} id="registrationGridFilter">
            <div className="flex gap-8 justify-center items-center">
              <Area
                id="orderGridFilter"
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <Field
                          type="text"
                          id="name"
                          name="name"
                          placeholder="Search"
                          value={currentFilters.find((f) => f.key === 'name')?.value}
                          onKeyPress={(e: React.KeyboardEvent) => {
                            if (e.key === 'Enter') {
                              const url = new URL(document.location.href);
                              const name = (document.getElementById('name') as HTMLInputElement)?.value;
                              if (name) {
                                url.searchParams.set('name[operation]', 'like');
                                url.searchParams.set('name[value]', name);
                              } else {
                                url.searchParams.delete('name[operation]');
                                url.searchParams.delete('name[value]');
                              }
                              window.location.href = url.href;
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
                          options={products.map((product) => ({
                            label: product.name,
                            value: product.uuid,
                            onSelect: () => {
                              const url = new URL(document.location.href);
                              url.searchParams.set('product_uuid', product.uuid);
                              window.location.href = url.href;
                            }
                          }))}
                          selectedOption={selectedOption?.name}
                          title="Product"
                        />
                      )
                    },
                    sortOrder: 10
                  }
                ]}
              />
            </div>
          </Form>
        }
        actions={[
          {
            variant: 'interactive',
            name: 'Export to Excel',
            onAction: () => {
              exportToExcel(registrations);
            }
          },
          {
            variant: 'interactive',
            name: 'Clear filter',
            onAction: () => {
              const url = new URL(document.location.href);
              url.search = '';
              window.location.href = url.href;
            }
          }
        ]}
      />
      <table className="listing sticky">
        <thead>
          <tr>
            <th>
              <Checkbox
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSelectedRows(
                    e.target.checked ? registrations.map((r) => r.uuid) : []
                  )
                }
              />
            </th>
            <SortableHeader
              title="First Name"
              name="firstName"
              currentFilters={currentFilters}
            />
            <SortableHeader
              title="Last Name"
              name="lastName"
              currentFilters={currentFilters}
            />
            <SortableHeader
              title="Product"
              name="product"
              currentFilters={currentFilters}
            />
          </tr>
        </thead>
        <tbody>
          <Actions
            registrations={registrations}
            selectedIds={selectedRows}
          />
          {registrations.map((r) => (
            <tr key={r.uuid}>
              <td style={{ width: '2rem' }}>
                <Checkbox
                  isChecked={selectedRows.includes(r.registrationId.toString())}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (e.target.checked)
                      setSelectedRows(selectedRows.concat([r.uuid]));
                    else
                      setSelectedRows(selectedRows.filter((uuid) => uuid !== r.uuid));
                  }}
                />
              </td>
              <td>{r.participant.firstName}</td>
              <td>{r.participant.lastName}</td>
              <td>{r.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {registrations.length === 0 && (
        <div className="flex w-full justify-center">
          No registrations to display.
        </div>
      )}
      <Pagination total={total} limit={limit} page={page} />
    </Card>
  );
}

function exportToExcel(registrations: Registration[]) {
  if (!registrations || registrations.length === 0) {
    alert("No registrations to export");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(
    registrations.map((r) => ({
      ID: r.registrationId,
      "First Name": r.participant.firstName,
      "Last Name": r.participant.lastName,
      "Product": r.name,
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

  XLSX.writeFile(workbook, "registrations.xlsx");
}
