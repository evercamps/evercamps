import { Card } from '@components/admin/cms/Card';
import CreateAt from '@components/admin/customer/customerGrid/rows/CreateAt';
import OrderNumberRow from '@components/admin/oms/orderGrid/rows/OrderNumberRow';
import PaymentStatusRow from '@components/admin/oms/orderGrid/rows/PaymentStatus';
import ShipmentStatusRow from '@components/admin/oms/orderGrid/rows/ShipmentStatus';
import TotalRow from '@components/admin/oms/orderGrid/rows/TotalRow';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import { Checkbox } from '@components/form/fields/Checkbox';
import { Form } from '@components/form/Form';
import SortableHeader from '@components/grid/headers/Sortable';
import Pagination from '@components/grid/Pagination';
import BasicRow from '@components/grid/rows/BasicRow';
import Filter from '@components/list/Filter';
import { useAlertContext } from '@components/modal/Alert';
import axios from 'axios';
import React, { useState } from 'react';

interface Status {
  code: string;
  name: string;
  badge: string;
  progress: string;
}

interface FilterItem {
  key: string;
  operation: string;
  value: string;
}

interface Order {
  orderId: string;
  uuid: string;
  orderNumber: string;
  createdAt: {
    value: string;
    text: string;
  };
  customerEmail: string;
  shipmentStatus: Status;
  paymentStatus: Status;
  grandTotal: {
    value: number;
    text: string;
  };
  editUrl: string;
  createShipmentApi: string;
}

interface OrderList {
  items: Order[];
  total: number;
  currentFilters: FilterItem[];
}

interface OrderGridProps {
  orders: OrderList;
  paymentStatusList: Status[];
  shipmentStatusList: Status[];
}

interface ActionsProps {
  orders: Order[];
  selectedIds: string[];
}

function Actions({ orders, selectedIds }: ActionsProps) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const fulfillOrders = async () => {
    setIsLoading(true);

    const promises = orders
      .filter((order) => selectedIds.includes(order.uuid))
      .map((order) => axios.post(order.createShipmentApi));

    await Promise.all(promises);

    setIsLoading(false);
    window.location.reload();
  };

  return (
    <tr>
      {selectedIds.length > 0 && (
        <td style={{ borderTop: 0 }} colSpan={100}>
          <div className="inline-flex border border-divider rounded justify-items-start">
            <a href="#" className="font-semibold pt-3 pb-3 pl-6 pr-6">
              {selectedIds.length} selected
            </a>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();

                openAlert({
                  heading: `Fulfill ${selectedIds.length} orders`,
                  content: (
                    <Checkbox
                      name="notify_customer"
                      label="Send notification to the customer"
                      onChange={() => {}}
                    />
                  ),
                  primaryAction: {
                    title: 'Cancel',
                    onAction: closeAlert,
                    variant: 'default'
                  },
                  secondaryAction: {
                    title: 'Mark as shipped',
                    onAction: async () => {
                      await fulfillOrders();
                    },
                    variant: 'primary',
                    isLoading
                  }
                });
              }}
              className="font-semibold pt-3 pb-3 pl-6 pr-6 block border-l border-divider self-center"
            >
              <span>Mark as shipped</span>
            </a>
          </div>
        </td>
      )}
    </tr>
  );
}

export default function OrderGrid({
  orders: { items: orders, total, currentFilters },
  paymentStatusList,
  shipmentStatusList
}: OrderGridProps) {
  const page =
    parseInt(
      currentFilters.find((f) => f.key === 'page')?.value || '1',
      10
    );

  const limit =
    parseInt(
      currentFilters.find((f) => f.key === 'limit')?.value || '20',
      10
    );

  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  return (
    <Card>
      <Card.Session
        title={
          <Form submitBtn={false} id="orderGridFilter">
            <div className="flex gap-8 justify-center items-center">
              <Area
                id="orderGridFilter"
                noOuter
                currentFilters={currentFilters}
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <Field
                          type="text"
                          name="keyword"
                          id="keyword"
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
                              const url = new URL(window.location.href);
                              const input =
                                document.getElementById(
                                  'keyword'
                                ) as HTMLInputElement | null;

                              if (input?.value) {
                                url.searchParams.set(
                                  'keyword',
                                  input.value
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
                          title="Payment status"
                          options={paymentStatusList.map((status) => ({
                            label: status.name,
                            value: status.code,
                            onSelect: () => {
                              const url = new URL(window.location.href);
                              url.searchParams.set(
                                'payment_status',
                                status.code
                              );
                              window.location.href = url.toString();
                            }
                          }))}
                          selectedOption={
                            currentFilters.find(
                              (f) => f.key === 'payment_status'
                            )?.value
                          }
                        />
                      )
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: () => (
                        <Filter
                          title="Shipment status"
                          options={shipmentStatusList.map((status) => ({
                            label: status.name,
                            value: status.code,
                            onSelect: () => {
                              const url = new URL(window.location.href);
                              url.searchParams.set(
                                'shipment_status',
                                status.code
                              );
                              window.location.href = url.toString();
                            }
                          }))}
                          selectedOption={
                            currentFilters.find(
                              (f) => f.key === 'shipment_status'
                            )?.value
                          }
                        />
                      )
                    },
                    sortOrder: 15
                  }
                ]}
              />
            </div>
          </Form>
        }
        actions={[
          {
            variant: 'interactive',
            name: 'Clear filter',
            onAction: () => {
              const url = new URL(window.location.href);
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
                  setSelectedRows(
                    e.target.checked
                      ? orders.map((o) => o.uuid)
                      : []
                  );
                }}
              />
            </th>

            <Area
              id="orderGridHeader"
              noOuter
              coreComponents={[
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Order Number"
                        name="number"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 5
                }
              ]}
            />
          </tr>
        </thead>
                <tbody>
          <Actions
            orders={orders}
            selectedIds={selectedRows}
          />

          {orders.map((order) => (
            <tr key={order.orderId}>
              <td>
                <Checkbox
                  isChecked={selectedRows.includes(order.uuid)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows([
                        ...selectedRows,
                        order.uuid
                      ]);
                    } else {
                      setSelectedRows(
                        selectedRows.filter(
                          (id) => id !== order.uuid
                        )
                      );
                    }
                  }}
                />
              </td>

              <Area
                id="orderGridRow"
                row={order}
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <OrderNumberRow
                          name={order.orderNumber}
                          editUrl={order.editUrl}
                        />
                      )
                    },
                    sortOrder: 5
                  },
                  {
                    component: {
                      default: () => (
                        <CreateAt time={order.createdAt.text} />
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
                          id="customerEmail"
                          areaProps={areaProps}
                        />
                      )
                    },
                    sortOrder: 15
                  },
                  {
                    component: {
                      default: () => (
                        <ShipmentStatusRow
                          status={order.shipmentStatus}
                        />
                      )
                    },
                    sortOrder: 20
                  },
                  {
                    component: {
                      default: () => (
                        <PaymentStatusRow
                          status={order.paymentStatus}
                        />
                      )
                    },
                    sortOrder: 25
                  },
                  {
                    component: {
                      default: () => (
                        <TotalRow
                          total={order.grandTotal.text}
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

      {orders.length === 0 && (
        <div className="flex w-full justify-center">
          There is no order to display
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
    orders(filters: $filters) {
      items {
        orderId
        uuid
        orderNumber
        createdAt {
          value
          text
        }
        customerEmail
        shipmentStatus {
          name
          code
          badge
          progress
        }
        paymentStatus {
          name
          code
          badge
          progress
        }
        grandTotal {
          value
          text
        }
        editUrl
        createShipmentApi
      }
      total
      currentFilters {
        key
        operation
        value
      }
    }

    paymentStatusList {
      code
      name
      badge
      progress
    }

    shipmentStatusList {
      code
      name
      badge
      progress
    }
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;