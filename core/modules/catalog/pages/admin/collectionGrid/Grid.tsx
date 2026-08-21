import CollectionNameRow from '@components/admin/catalog/collectionGrid/rows/CollectionNameRow';
import { Card } from '@components/admin/cms/Card';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import { Checkbox } from '@components/form/fields/Checkbox';
import { Form } from '@components/form/Form';
import DummyColumnHeader from '@components/grid/headers/Dummy';
import SortableHeader from '@components/grid/headers/Sortable';
import Pagination from '@components/grid/Pagination';
import TextRow from '@components/grid/rows/TextRow';
import { useAlertContext } from '@components/modal/Alert';
import axios from 'axios';
import React, { useState } from 'react';

interface Filter {
  key: string;
  operation: string;
  value: string;
}

interface Collection {
  collectionId: number;
  uuid: string;
  name: string;
  code: string;
  editUrl: string;
  deleteApi: string;
}

interface CollectionsData {
  items: Collection[];
  total: number;
  currentFilters?: Filter[];
}

interface ActionsProps {
  collections?: Collection[];
  selectedIds?: string[];
}

interface CollectionGridProps {
  collections: CollectionsData;
}

function Actions({
  collections = [],
  selectedIds = []
}: ActionsProps) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const deleteCollections = async () => {
    setIsLoading(true);

    const promises = collections
      .filter((c) => selectedIds.includes(c.uuid))
      .map((col) => axios.delete(col.deleteApi));

    await Promise.all(promises);

    setIsLoading(false);
    window.location.reload();
  };

  const actions = [
    {
      name: 'Delete',
      onAction: () => {
        openAlert({
          heading: `Delete ${selectedIds.length} collections`,
          content: <div>Can&apos;t be undone</div>,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Delete',
            onAction: async () => {
              await deleteCollections();
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

export default function CollectionGrid({
  collections: { items: collections, total, currentFilters = [] }
}: CollectionGridProps) {
  const pageFilter = currentFilters.find(
    (filter) => filter.key === 'page'
  );

  const limitFilter = currentFilters.find(
    (filter) => filter.key === 'limit'
  );

  const page = pageFilter ? parseInt(pageFilter.value, 10) : 1;
  const limit = limitFilter ? parseInt(limitFilter.value, 10) : 20;

  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  return (
    <div className="w-2/3" style={{ margin: '0 auto' }}>
      <Card>
        <Card.Session
          title={
            <Form submitBtn={false} id="collectionGridFilter">
              <Field
                type="text"
                id="name"
                name="name"
                placeholder="Search"
                value={
                  currentFilters.find((f) => f.key === 'name')?.value
                }
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const url = new URL(document.location.href);
                    const name = (
                      document.getElementById('name') as HTMLInputElement
                    )?.value;

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
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(collections.map((c) => c.uuid));
                    } else {
                      setSelectedRows([]);
                    }
                  }}
                />
              </th>

              <Area
                className=""
                id="collectionGridHeader"
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <DummyColumnHeader
                          title="ID"
                        />
                      )
                    },
                    sortOrder: 5
                  },
                  {
                    component: {
                      default: () => (
                        <SortableHeader
                          title="Collection Name"
                          name="name"
                          currentFilters={currentFilters}
                        />
                      )
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: () => (
                        <SortableHeader
                          title="Code"
                          name="code"
                          currentFilters={currentFilters}
                        />
                      )
                    },
                    sortOrder: 15
                  }
                ]}
              />
            </tr>
          </thead>

          <tbody>
            <Actions
              collections={collections}
              selectedIds={selectedRows}
            />

            {collections.map((c) => (
              <tr key={c.collectionId}>
                <td style={{ width: '2rem' }}>
                  <Checkbox
                    isChecked={selectedRows.includes(c.uuid)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows([...selectedRows, c.uuid]);
                      } else {
                        setSelectedRows(
                          selectedRows.filter((r) => r !== c.uuid)
                        );
                      }
                    }}
                  />
                </td>

                <Area
                  className=""
                  id="collectionGridRow"
                  row={c}
                  noOuter
                  coreComponents={[
                    {
                      component: {
                        default: () => (
                          <TextRow text={c.collectionId.toString()} />
                        )
                      },
                      sortOrder: 5
                    },
                    {
                      component: {
                        default: () => (
                          <CollectionNameRow
                            name={c.name}
                            url={c.editUrl}
                          />
                        )
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: () => <TextRow text={c.code} />
                      },
                      sortOrder: 15
                    }
                  ]}
                />
              </tr>
            ))}
          </tbody>
        </table>

        {collections.length === 0 && (
          <div className="flex w-full justify-center">
            There is no collections to display
          </div>
        )}

        <Pagination total={total} limit={limit} page={page} />
      </Card>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    collections(filters: $filters) {
      items {
        collectionId
        uuid
        name
        code
        editUrl
        deleteApi
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