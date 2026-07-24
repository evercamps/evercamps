import Button from '@components/form/Button';
import React from 'react';

interface Shipment {
  carrier?: string;
  trackingNumber?: string;
}

interface Order {
  shipment?: Shipment;
}

interface Carrier {
  name?: string;
  code?: string;
  trackingUrl?: string;
}

interface TrackingButtonProps {
  order: Order;
  carriers: Carrier[];
}

export default function TrackingButton({
  order: { shipment },
  carriers
}: TrackingButtonProps) {
  if (!shipment || !shipment.trackingNumber || !shipment.carrier) {
    return null;
  }

  const carrier = carriers.find((c) => c.code === shipment.carrier);

  if (!carrier || !carrier.trackingUrl) {
    return null;
  }

  const url = carrier.trackingUrl.replace(
    /\{\s*trackingNumber\s*\}/g,
    shipment.trackingNumber
  );

  return (
    <Button
      title="Track shipment"
      variant="primary"
      onAction={() => {
        window.open(url, '_blank')?.focus();
      }}
    />
  );
}

export const layout = {
  areaId: 'order_actions',
  sortOrder: 15
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      shipment {
        shipmentId
        carrier
        trackingNumber
        updateShipmentApi
      }
      createShipmentApi
    },
    carriers {
      name
      code
      trackingUrl
    }
  }
`;