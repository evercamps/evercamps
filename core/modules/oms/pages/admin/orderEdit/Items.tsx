import React from 'react';
import Area from '@components/Area';
import { Circle, CircleVariant } from '@components/Circle';
import './Items.scss';
import { Card } from '@components/admin/cms/Card';
import { Name } from '@components/admin/oms/orderEdit/items/Name';
import { Price } from '@components/admin/oms/orderEdit/items/Price';
import { Thumbnail } from '@components/admin/oms/orderEdit/items/Thumbnail';

interface PriceValue {
  value: number;
  text: string;
}

interface Registration {
  firstName: string;
  lastName: string;
  participant?: {
    editUrl?: string;
  };
}

interface OrderItem {
  id: string;
  qty: number;
  productName: string;
  productSku: string;
  productUrl?: string;
  thumbnail?: string;
  variantOptions?: string;
  registrations?: Registration[];
  productPrice?: PriceValue;
  finalPrice?: PriceValue;
  total?: PriceValue;
  lineTotal: PriceValue;
}

interface ShipmentStatus {
  code?: string;
  badge?: CircleVariant;
  progress?: string;
  name?: string;
}

interface Shipment {
  shipmentId?: string;
  carrier?: string;
  trackingNumber?: string;
  updateShipmentApi?: string;
}

interface Order {
  items: OrderItem[];
  shipmentStatus: ShipmentStatus;
  shipment?: Shipment;
  createShipmentApi: string;
}

interface ItemsProps {
  order: Order;
}

export default function Items({
  order: { items, shipmentStatus }
}: ItemsProps) {
  return (
    <Card
      title={
        <div className="flex space-x-4">
          <Circle variant={shipmentStatus.badge || 'new'} />
          <span className="block self-center">
            {shipmentStatus.name || 'Unknown'}
          </span>
        </div>
      }
    >
      <Card.Session>
        <table className="listing order-items">
          <tbody>
            {items.map((i, k) => (
              <tr key={k}>
                <Area
                  key={k}
                  id={`order_item_row_${i.id}`}
                  noOuter
                  item={i}
                  coreComponents={[
                    {
                      component: { default: Thumbnail },
                      props: {
                        imageUrl: i.thumbnail,
                        qty: i.qty
                      },
                      sortOrder: 10,
                      id: 'productThumbnail'
                    },
                    {
                      component: { default: Name },
                      props: {
                        name: i.productName,
                        productSku: i.productSku,
                        productUrl: i.productUrl,
                        variantOptions: JSON.parse(
                          i.variantOptions || '[]'
                        ),
                        registrations: i.registrations
                      },
                      sortOrder: 20,
                      id: 'productName'
                    },
                    {
                      component: { default: Price },
                      props: {
                        price: i.productPrice?.text,
                        qty: i.qty
                      },
                      sortOrder: 30,
                      id: 'price'
                    },
                    {
                      component: { default: 'td' },
                      props: {
                        children: <span>{i.lineTotal.text}</span>,
                        key: 'lineTotal'
                      },
                      sortOrder: 40,
                      id: 'lineTotal'
                    }
                  ]}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </Card.Session>

      <Card.Session>
        <div className="flex justify-end gap-4">
          <Area id="order_actions" noOuter />
        </div>
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      currency
      shipment {
        shipmentId
        carrier
        trackingNumber
        updateShipmentApi
      }
      shipmentStatus {
        code
        badge
        progress
        name
      }
      items {
        id: orderItemId
        qty
        registrations {
          firstName
          lastName
          participant {
            editUrl
          }
        }
        productName
        productSku
        productUrl
        thumbnail
        variantOptions
        productPrice {
          value
          text
        }
        finalPrice {
          value
          text
        }
        total {
          value
          text
        }
        lineTotal {
          value
          text
        }
      }
      createShipmentApi
    }
    carriers {
      label: name
      value: code
    }
  }
`;