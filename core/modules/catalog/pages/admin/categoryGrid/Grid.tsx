import CategoryNameRow from '@components/admin/catalog/categoryGrid/rows/CategoryName';
import { Card } from '@components/admin/cms/Card';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import { Checkbox } from '@components/form/fields/Checkbox';
import { Form } from '@components/form/Form';
import SortableHeader from '@components/grid/headers/Sortable';
import Pagination from '@components/grid/Pagination';
import StatusRow from '@components/grid/rows/StatusRow';
import YesNoRow from '@components/grid/rows/YesNoRow';
import { useAlertContext } from '@components/modal/Alert';
import axios from 'axios';
import React, { ChangeEvent, useState } from 'react';

interface Filter {
  key: string;
  operation: string;
  value: string;
}

interface CategoryPath {
  name: string;
}

interface Category {
  categoryId: number;
  uuid: string;
  name: string;
  status: number;
  includeInNav: number;
  editUrl: string;
  deleteApi: string;
  path?: CategoryPath[];
}

interface CategoryResponse {
  items: Category[];
  total: number;
  currentFilters?: Filter[];
}

interface CategoryGridProps {
  categories: CategoryResponse;
}

interface Action {
  name: string;
  onAction: () => void;
}

interface ActionsProps {
  categories?: Category[];
  selectedIds?: string[];
}

function Actions({
  categories = [],
  selectedIds = []
}: ActionsProps) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const deleteCategories = async () => {
    setIsLoading(true);

    const promises = categories
      .filter((category) => selectedIds.includes(category.uuid))
      .map((category) => axios.delete(category.deleteApi));

    await Promise.all(promises);

    setIsLoading(false);
    window.location.reload();
  };

  const actions: Action[] = [
    {
      name: 'Delete',
      onAction: () => {
        openAlert({
          heading: `Delete ${selectedIds.length} categories`,
          content: <div>Can&apos;t be undone</div>,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Delete',
            onAction: async () => {
              await deleteCategories();
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

export default function CategoryGrid({
  categories: { items: categories, total, currentFilters = [] }
}: CategoryGridProps) {
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
    <Card>
      <Card.Session
        title={
          <Form submitBtn={false} id="categoryGridFilter">
            <Field
              type="text"
              id="name"
              name="name"
              placeholder="Search"
              value={
                currentFilters.find((f) => f.key === 'name')?.value
              }
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  const url = new URL(document.location.href);
                  const name = (document.getElementById('name') as HTMLInputElement)?.value;

                  if (name) {
                    url.searchParams.set(
                      'name[operation]',
                      'like'
                    );
                    url.searchParams.set(
                      'name[value]',
                      name
                    );
                  } else {
                    url.searchParams.delete(
                      'name[operation]'
                    );
                    url.searchParams.delete(
                      'name[value]'
                    );
                  }

                  window.location.href = url.toString();
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
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  if (e.target.checked) {
                    setSelectedRows(
                      categories.map((c) => c.uuid)
                    );
                  } else {
                    setSelectedRows([]);
                  }
                }}
              />
            </th>

            <Area
              className=""
              id="categoryGridHeader"
              noOuter
              coreComponents={[
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Category Name"
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
                        name="status"
                        title="Status"
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
                        name="include_in_nav"
                        title="Include In Menu"
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
          <Actions
            categories={categories}
            selectedIds={selectedRows}
          />

          {categories.map((c) => (
            <tr key={c.categoryId}>
              <td style={{ width: '2rem' }}>
                <Checkbox
                  isChecked={selectedRows.includes(c.uuid)}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.checked) {
                      setSelectedRows([
                        ...selectedRows,
                        c.uuid
                      ]);
                    } else {
                      setSelectedRows(
                        selectedRows.filter(
                          (r) => r !== c.uuid
                        )
                      );
                    }
                  }}
                />
              </td>

              <Area
                className=""
                id="categoryGridRow"
                row={c}
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <CategoryNameRow
                          category={c}
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
                        areaProps: {
                          row: Category;
                        };
                      }) => (
                        <StatusRow
                          id="status"
                          areaProps={areaProps}
                        />
                      )
                    },
                    sortOrder: 25
                  },
                  {
                    component: {
                      default: () => (
                        <YesNoRow
                          value={c.includeInNav}
                        />
                      )
                    },
                    sortOrder: 30
                  }
                ]}
              />
            </tr>
          ))}
        </tbody>
      </table>

      {categories.length === 0 && (
        <div className="flex w-full justify-center">
          There is no category to display
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
    categories(filters: $filters) {
      items {
        categoryId
        uuid
        name
        status
        includeInNav
        editUrl
        deleteApi
        path {
          name
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