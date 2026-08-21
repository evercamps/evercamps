import ProductPriceRow from '@components/admin/catalog/productGrid/rows/PriceRow';
import ProductNameRow from '@components/admin/catalog/productGrid/rows/ProductName';
import QtyRow from '@components/admin/catalog/productGrid/rows/QtyRow';
import ThumbnailRow from '@components/admin/catalog/productGrid/rows/ThumbnailRow';
import { Card } from '@components/admin/cms/Card';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import { Checkbox } from '@components/form/fields/Checkbox';
import { Form } from '@components/form/Form';
import DummyColumnHeader from '@components/grid/headers/Dummy';
import SortableHeader from '@components/grid/headers/Sortable';
import Pagination from '@components/grid/Pagination';
import BasicRow from '@components/grid/rows/BasicRow';
import StatusRow from '@components/grid/rows/StatusRow';
import Filter from '@components/list/Filter';
import { useAlertContext } from '@components/modal/Alert';
import axios from 'axios';
import React, { useState } from 'react';

interface ProductFilter {
  key: string;
  operation?: string;
  value: string;
}

interface Product {
  productId?: number;
  uuid: string;
  name?: string;
  image?: {
    thumb?: string;
  };
  sku?: string;
  status?: number;
  inventory?: {
    qty?: number;
  };
  price?: {
    regular?: {
      value?: number;
      text?: string;
    };
  };
  editUrl?: string;
  updateApi: string;
  deleteApi: string;
}

interface ProductsData {
  items: Product[];
  total: number;
  currentFilters?: ProductFilter[];
}

interface ActionsProps {
  products?: Product[];
  selectedIds?: string[];
}

function Actions({
  products = [],
  selectedIds = []
}: ActionsProps) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const updateProducts = async (status: number) => {
    setIsLoading(true);

    const promises = products
      .filter((product) => selectedIds.includes(product.uuid))
      .map((product) =>
        axios.patch(product.updateApi, {
          status
        })
      );

    await Promise.all(promises);

    setIsLoading(false);
    window.location.reload();
  };

  const deleteProducts = async () => {
    setIsLoading(true);

    const promises = products
      .filter((product) => selectedIds.includes(product.uuid))
      .map((product) => axios.delete(product.deleteApi));

    await Promise.all(promises);

    setIsLoading(false);
    window.location.reload();
  };

  const actions = [
    {
      name: 'Disable',
      onAction: () => {
        openAlert({
          heading: `Disable ${selectedIds.length} products`,
          content: 'Are you sure?',
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Disable',
            onAction: async () => {
              await updateProducts(0);
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
          heading: `Enable ${selectedIds.length} products`,
          content: 'Are you sure?',
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Enable',
            onAction: async () => {
              await updateProducts(1);
            },
            variant: 'critical',
            isLoading: false
          }
        });
      }
    },
    {
      name: 'Delete',
      onAction: () => {
        openAlert({
          heading: `Delete ${selectedIds.length} products`,
          content: <div>Can&apos;t be undone</div>,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Delete',
            onAction: async () => {
              await deleteProducts();
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

            {actions.map((action) => (
              <a
                key={action.name}
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

interface ProductGridProps {
  products: ProductsData;
}

export default function ProductGrid({
  products: {
    items: products,
    total,
    currentFilters = []
  }
}: ProductGridProps) {
  const pageFilter = currentFilters.find(
    (filter) => filter.key === 'page'
  );

  const page = pageFilter
    ? parseInt(pageFilter.value, 10)
    : 1;

  const limitFilter = currentFilters.find(
    (filter) => filter.key === 'limit'
  );

  const limit = limitFilter
    ? parseInt(limitFilter.value, 10)
    : 20;

  const [selectedRows, setSelectedRows] = useState<string[]>([]);
    return (
    <Card>
      <Card.Session
        title={
          <Form submitBtn={false} id="productGridFilter">
            <div className="flex gap-8 justify-center items-center">
              <Area
                id="productGridFilter"
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <Field
                          name="keyword"
                          type="text"
                          id="keyword"
                          placeholder="Search"
                          value={
                            currentFilters.find(
                              (f) => f.key === 'keyword'
                            )?.value
                          }
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const url = new URL(document.location.href);
                              const keyword =
                                (
                                  document.getElementById(
                                    'keyword'
                                  ) as HTMLInputElement | null
                                )?.value;

                              if (keyword) {
                                url.searchParams.set(
                                  'keyword',
                                  keyword
                                );
                              } else {
                                url.searchParams.delete('keyword');
                              }

                              window.location.href = url.toString();
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
                                const url = new URL(document.location.href);
                                url.searchParams.set('status', '1');
                                window.location.href = url.toString();
                              }
                            },
                            {
                              label: 'Disabled',
                              value: '0',
                              onSelect: () => {
                                const url = new URL(document.location.href);
                                url.searchParams.set('status', '0');
                                window.location.href = url.toString();
                              }
                            }
                          ]}
                          selectedOption={
                            currentFilters.find(
                              (f) => f.key === 'status'
                            )?.value === '1'
                              ? 'Enabled'
                              : currentFilters.find(
                                  (f) => f.key === 'status'
                                )?.value === '0'
                                ? 'Disabled'
                                : undefined
                          }
                          title="Status"
                        />
                      )
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: () => (
                        <Filter
                          options={[
                            {
                              label: 'Simple',
                              value: '1',
                              onSelect: () => {
                                const url = new URL(document.location.href);
                                url.searchParams.set(
                                  'type',
                                  'simple'
                                );
                                window.location.href = url.toString();
                              }
                            },
                            {
                              label: 'Configurable',
                              value: '0',
                              onSelect: () => {
                                const url = new URL(document.location.href);
                                url.searchParams.set(
                                  'type',
                                  'configurable'
                                );
                                window.location.href = url.toString();
                              }
                            }
                          ]}
                          selectedOption={
                            currentFilters.find(
                              (f) => f.key === 'type'
                            )?.value
                          }
                          title="Product type"
                        />
                      )
                    },
                    sortOrder: 15
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
                    setSelectedRows(
                      products.map((p) => p.uuid)
                    );
                  } else {
                    setSelectedRows([]);
                  }
                }}
              />
            </th>

            <Area
              id="productGridHeader"
              noOuter
              coreComponents={[
                {
                  component: {
                    default: () => (
                      <th className="column">
                        <div className="table-header id-header">
                          <div className="font-medium uppercase text-xl">
                            Thumbnail
                          </div>
                        </div>
                      </th>
                    )
                  },
                  sortOrder: 5
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Name"
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
                        title="Price"
                        name="price"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 15
                },
                {
                  component: {
                    default: () => (
                      <DummyColumnHeader title="SKU" />
                    )
                  },
                  sortOrder: 20
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Stock"
                        name="qty"
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
                        title="Status"
                        name="status"
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
            products={products}
            selectedIds={selectedRows}
          />

          {products.map((p) => (
            <tr key={p.uuid}>
              <td>
                <Checkbox
                  isChecked={selectedRows.includes(p.uuid)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows([
                        ...selectedRows,
                        p.uuid
                      ]);
                    } else {
                      setSelectedRows(
                        selectedRows.filter(
                          (row) => row !== p.uuid
                        )
                      );
                    }
                  }}
                />
              </td>

              <Area
                id="productGridRow"
                row={p}
                noOuter
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <ThumbnailRow
                          src={p.image?.thumb}
                          name={p.name}
                        />
                      )
                    },
                    sortOrder: 5
                  },
                  {
                    component: {
                      default: () => (
                        <ProductNameRow
                          name={p.name}
                          url={p.editUrl}
                        />
                      )
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: ({ areaProps }: any) => (
                        <ProductPriceRow
                          areaProps={areaProps}
                        />
                      )
                    },
                    sortOrder: 15
                  },
                  {
                    component: {
                      default: ({ areaProps }: any) => (
                        <BasicRow
                          id="sku"
                          areaProps={areaProps}
                        />
                      )
                    },
                    sortOrder: 20
                  },
                  {
                    component: {
                      default: () => (
                        <QtyRow qty={p.inventory?.qty} />
                      )
                    },
                    sortOrder: 25
                  },
                  {
                    component: {
                      default: ({ areaProps }: any) => (
                        <StatusRow
                          id="status"
                          areaProps={areaProps}
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

      {products.length === 0 && (
        <div className="flex w-full justify-center">
          There is no product to display
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
    products(filters: $filters) {
      items {
        productId
        uuid
        name
        image {
          thumb
        }
        sku
        status
        inventory {
          qty
        }
        price {
          regular {
            value
            text
          }
        }
        editUrl
        updateApi
        deleteApi
      }
      total
      currentFilters {
        key
        operation
        value
      }
    }
    newProductUrl: url(routeId: "productNew")
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;