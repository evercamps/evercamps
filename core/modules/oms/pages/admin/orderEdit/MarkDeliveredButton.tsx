import Button from '@components/form/Button';
import React from 'react';
import { toast } from 'react-toastify';

interface ShipmentStatus {
  code: string;
}

interface Shipment {
  shipmentId: number;
}

interface Order {
  orderId: string;
  shipmentStatus: ShipmentStatus;
  shipment?: Shipment;
}

interface MarkDeliveredButtonProps {
  order: Order;
  markDeliveredApi: string;
}

export default function MarkDeliveredButton({
  order: {
    orderId,
    shipmentStatus: { code },
    shipment
  },
  markDeliveredApi
}: MarkDeliveredButtonProps) {
  if (!shipment || code === 'delivered') {
    return null;
  }

  return (
    <Button
      title="Mark Delivered"
      variant="primary"
      onAction={async () => {
        const response = await fetch(markDeliveredApi, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ order_id: orderId })
        });

        const data: {
          error?: {
            message: string;
          };
        } = await response.json();

        if (!data.error) {
          window.location.reload();
        } else {
          toast.error(data.error.message);
        }
      }}
    />
  );
}

export const layout = {
  areaId: 'order_actions',
  sortOrder: 10
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      orderId
      shipmentStatus {
        code
      }
      shipment {
        shipmentId
      }
    },
    markDeliveredApi: url(routeId: "markDelivered")
  }
`;