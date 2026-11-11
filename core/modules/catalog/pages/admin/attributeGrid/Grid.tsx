import AttributeNameRow from '@components/admin/catalog/attributeGrid/rows/AttributeName';
import GroupRow from '@components/admin/catalog/attributeGrid/rows/GroupRow';
import { Card } from '@components/admin/cms/Card';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import { Checkbox } from '@components/form/fields/Checkbox';
import { Form } from '@components/form/Form';
import DummyColumnHeader from '@components/grid/headers/Dummy';
import SortableHeader from '@components/grid/headers/Sortable';
import Pagination from '@components/grid/Pagination';
import BasicRow from '@components/grid/rows/BasicRow';
import YesNoRow from '@components/grid/rows/YesNoRow';
import { useAlertContext } from '@components/modal/Alert';
import axios from 'axios';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface Filter {
  key: string;
  operation: string;
  value: string;
}

interface Group {
  attributeGroupId: string;
  groupName: string;
  updateApi: string;
}

interface Attribute {
  uuid: string;
  attributeId: string;
  attributeName: string;
  attributeCode: string;
  type: string;
  isRequired: number;
  isFilterable: number;
  editUrl: string;
  updateApi: string;
  deleteApi: string;
  groups?: {
    items?: Group[];
  };
}

interface AttributeResponse {
  items: Attribute[];
  total: number;
  currentFilters?: Filter[];
}

interface ActionsProps {
  attributes?: Attribute[];
  selectedIds?: string[];
}

function Actions({
  attributes = [],
  selectedIds = []
}: ActionsProps) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const deleteAttributes = async () => {
    setIsLoading(true);

    try {
      const promises = attributes
        .filter((attribute) => selectedIds.includes(attribute.uuid))
        .map((attribute) =>
          axios.delete(attribute.deleteApi, {
            validateStatus: () => true
          })
        );

      const responses = await Promise.allSettled(promises);

      setIsLoading(false);

      responses.forEach((response) => {
        if (response.status === 'fulfilled') {
          if (response.value.status !== 200) {
            throw new Error(response.value.data.error.message);
          }
        }
      });

      window.location.reload();
    } catch (e) {
      setIsLoading(false);
      toast.error(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <tr>
      {selectedIds.length > 0 && (
        <td style={{ borderTop: 0 }} colSpan={100}>
          <div className="inline-flex border border-divider rounded justify-items-start">
            <a className="font-semibold pt-3 pb-3 pl-6 pr-6">
              {selectedIds.length} selected
            </a>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();

                openAlert({
                  heading: `Delete ${selectedIds.length} attributes`,
                  content: <div>Can&apos;t be undone</div>,
                  primaryAction: {
                    title: 'Cancel',
                    onAction: closeAlert,
                    variant: 'primary'
                  },
                  secondaryAction: {
                    title: 'Delete',
                    onAction: deleteAttributes,
                    variant: 'critical',
                    isLoading
                  }
                });
              }}
              className="font-semibold pt-3 pb-3 pl-6 pr-6 block border-l border-divider self-center"
            >
              Delete
            </a>
          </div>
        </td>
      )}
    </tr>
  );
}

interface AttributeGridProps {
  attributes: AttributeResponse | null;
}

// Restored from the pre-TypeScript Grid.jsx (commit 62883fd^): the TS
// conversion in #164 replaced the whole table with a literal "...", so the
// attribute grid rendered nothing.
export default function AttributeGrid({ attributes: attributesProp }: AttributeGridProps) {
  const {
    items: attributes = [],
    total = 0,
    currentFilters = []
  } = attributesProp ?? ({} as Partial<AttributeResponse>);

  const pageFilter = currentFilters.find((f) => f.key === 'page');
  const limitFilter = currentFilters.find((f) => f.key === 'limit');

  const page = pageFilter ? parseInt(pageFilter.value, 10) : 1;
  const limit = limitFilter ? parseInt(limitFilter.value, 10) : 20;

  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  return (
    <Card>
      <Card.Session
        title={
          <Form submitBtn={false} id="attributeGridFilter">
            <Field
              type="text"
              id="name"
              name="name"
              placeholder="Search"
              value={currentFilters.find((f) => f.key === 'name')?.value}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                // If the user presses enter, submit the filter
                if (e.key === 'Enter') {
                  const url = new URL(document.location.href);
                  const name = (document.getElementById('name') as HTMLInputElement | null)?.value;
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
          </Form>
        }
        actions={[
          {
            variant: 'interactive',
            name: 'Clear filter',
            onAction: () => {
              // Just get the url and remove all query params
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
            <th className="align-bottom">
              <Checkbox
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  if (e.target.checked) {
                    setSelectedRows(attributes.map((a) => a.uuid));
                  } else {
                    setSelectedRows([]);
                  }
                }}
              />
            </th>
            <Area
              className=""
              id="attributeGridHeader"
              noOuter
              coreComponents={[
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        name="name"
                        title="Attribute Name"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 10
                },
                {
                  component: {
                    default: () => <DummyColumnHeader title="Groups" />
                  },
                  sortOrder: 15
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        name="type"
                        title="Type"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 20
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        name="is_required"
                        title="Is Required?"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 25
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        name="is_filterable"
                        title="Is Filterable?"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 30
                }
              ]}
            />
          </tr>
        </thead>
        <tbody>
          <Actions attributes={attributes} selectedIds={selectedRows} />
          {attributes.map((a) => (
            <tr key={a.attributeId}>
              <td>
                <Checkbox
                  isChecked={selectedRows.includes(a.uuid)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (e.target.checked) {
                      setSelectedRows(selectedRows.concat([a.uuid]));
                    } else {
                      setSelectedRows(selectedRows.filter((r) => r !== a.uuid));
                    }
                  }}
                />
              </td>
              <Area
                className=""
                id="attributeGridRow"
                row={a}
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <AttributeNameRow
                          name={a.attributeName}
                          url={a.editUrl}
                        />
                      )
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: () => <GroupRow groups={a.groups?.items} />
                    },
                    sortOrder: 15
                  },
                  {
                    component: {
                      default: ({ areaProps }: { areaProps: any }) => (
                        <BasicRow id="type" areaProps={areaProps} />
                      )
                    },
                    sortOrder: 20
                  },
                  {
                    component: {
                      default: () => <YesNoRow value={a.isRequired} />
                    },
                    sortOrder: 25
                  },
                  {
                    component: {
                      default: () => <YesNoRow value={a.isFilterable} />
                    },
                    sortOrder: 30
                  }
                ]}
              />
            </tr>
          ))}
        </tbody>
      </table>
      {attributes.length === 0 && (
        <div className="flex w-full justify-center">
          There is no attribute to display
        </div>
      )}
      <Pagination total={total} limit={limit} page={page} />
    </Card>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    attributes (filters: $filters) {
      items {
        attributeId
        uuid
        attributeName
        attributeCode
        type
        isRequired
        isFilterable
        editUrl
        updateApi
        deleteApi
        groups {
          items {
            attributeGroupId
            groupName
            updateApi
          }
        }
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
