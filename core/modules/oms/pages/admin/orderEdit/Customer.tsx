import { Card } from '@components/admin/cms/Card';
import { AddressSummary } from '@components/customer/address/AddressSummary';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface Province {
  code: string;
  name: string;
}

interface Country {
  code: string;
  name: string;
}

interface Address {
  fullName: string;
  address1: string;
  address2?: string;
  city: string;
  postcode: string;
  telephone: string;
  province: Province;
  country: Country;
}

interface Order {
  customerFullName: string;
  customerEmail: string;
  customerUrl?: string;
  shippingAddress?: Address;
  billingAddress: Address;
}

interface CustomerProps {
  order: Order;
}

export default function Customer({
  order: {
    shippingAddress,
    billingAddress,
    customerFullName,
    customerEmail,
    customerUrl
  }
}: CustomerProps) {
  return (
    <Card title="Customer">
      <Card.Session>
        {customerUrl && (
          <a
            href={customerUrl}
            className="text-interactive hover:underline block"
          >
            {customerFullName}
          </a>
        )}

        {!customerUrl && (
          <span>{customerEmail} (Guest Checkout)</span>
        )}
      </Card.Session>

      <Card.Session title="Contact information">
        <div>
          <a href="#" className="text-interactive hover:underline">
            {customerEmail}
          </a>
        </div>

        <div>
          <span>
            {shippingAddress?.telephone ||
              billingAddress?.telephone ||
              _('No phone provided')}
          </span>
        </div>
      </Card.Session>

      <Card.Session title="Shipping Address">
        {shippingAddress ? (
          <AddressSummary address={shippingAddress} />
        ) : (
          <span className="italic text-textSubdued">
            {_('No shipping address provided')}
          </span>
        )}
      </Card.Session>

      <Card.Session title="Billing address">
        <AddressSummary address={billingAddress} />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      customerFullName
      customerEmail
      customerUrl
      shippingAddress {
        fullName
        city
        address1
        address2
        postcode
        telephone
        province {
          code
          name
        }
        country {
          code
          name
        }
      }
      billingAddress {
        fullName
        city
        address1
        address2
        postcode
        telephone
        province {
          code
          name
        }
        country {
          code
          name
        }
      }
    }
  }
`;