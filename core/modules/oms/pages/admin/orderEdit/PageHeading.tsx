import PageHeading from '@components/admin/cms/PageHeading';
import React from 'react';

interface Order {
  orderNumber: string;
}

interface OrderEditPageHeadingProps {
  backUrl: string;
  order: Order;
}

export default function OrderEditPageHeading({
  backUrl,
  order
}: OrderEditPageHeadingProps) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={`Editing #${order.orderNumber}`}
    />
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId", null)) {
      orderNumber
    }
    backUrl: url(routeId: "orderGrid")
  }
`;