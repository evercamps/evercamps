import Order from '@components/frontStore/customer/detail/Order';
import React from 'react';

import { _ } from '../../../../../lib/locale/translate/_.js';

interface Price {
  value: number;
  text: string;
}

interface Status {
  name: string;
  code: string;
  badge: string;
}

interface OrderItem {
  productName: string;
  thumbnail?: string;
  productPrice?: Price;
  productSku: string;
  qty: number;
}

interface CustomerOrder {
  orderId: string;
  orderNumber: string;
  createdAt?: {
    text: string;
  };
  shipmentStatus?: Status;
  paymentStatus?: Status;
  grandTotal?: Price;
  items?: OrderItem[];
}

interface OrderHistoryProps {
  customer: {
    orders?: CustomerOrder[];
  };
}

export default function OrderHistory({
  customer: { orders = [] }
}: OrderHistoryProps) {
  return (
    <div className="order-history divide-y">
      {orders.length === 0 && (
        <div className="order-history-empty">
          {_('You have not placed any orders yet')}
        </div>
      )}

      {orders.map((order) => (
        <div
          className="order-history-order border-divider py-8"
          key={order.orderId}
        >
          <Order order={order} key={order.orderId} />
        </div>
      ))}
    </div>
  );
}

export const layout = {
  areaId: 'accountPageOrderHistory',
  sortOrder: 10
};

export const query = `
  query Query {
    customer: currentCustomer {
      orders {
        orderId
        orderNumber
        createdAt {
          text
        }
        shipmentStatus {
          name
          code
          badge
        }
        paymentStatus {
          name
          code
          badge
        }
        grandTotal {
          value
          text
        }
        items {
          productName
          thumbnail
          productPrice {
            value
            text
          }
          productSku
          qty
        }
      }
    }
  }
`;