import { Card } from '@components/admin/cms/Card';
import Area from '@components/Area';
import React from 'react';

interface Order {
  shippingNote?: string;
}

interface CustomerNotesProps {
  order: Order;
}

export default function CustomerNotes({
  order: { shippingNote }
}: CustomerNotesProps) {
  return (
    <Card title="Customer notes">
      <Card.Session>
        <Area
          id="orderEditCustomerNotes"
          coreComponents={[
            {
              component: {
                default: () => (
                  <div>
                    {shippingNote || (
                      <span className="text-border">
                        No notes from customer
                      </span>
                    )}
                  </div>
                )
              },
              props: {},
              sortOrder: 10,
              id: 'title'
            }
          ]}
          noOuter
        />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      shippingNote
    }
  }
`;