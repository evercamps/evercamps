import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/form/Field';
import { Toggle } from '@components/form/fields/Toggle';
import React from 'react';

interface StripePaymentProps {
  setting: {
    stripePaymentStatus: number;
    stripeDisplayName: string;
    stripePublishableKey: string;
    stripeSecretKey: string;
    stripeEndpointSecret: string;
    stripePaymentMode: string;
  };
}

export default function StripePayment({
  setting: {
    stripePaymentStatus,
    stripeDisplayName,
    stripePublishableKey,
    stripeSecretKey,
    stripeEndpointSecret,
    stripePaymentMode
  }
}: StripePaymentProps) {
  return (
    <Card title="Stripe Payment">
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Enable?</h4>
          </div>
          <div className="col-span-2">
            <Toggle
              name="stripePaymentStatus"
              value={stripePaymentStatus}
            />
          </div>
        </div>
      </Card.Session>

      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Display Name</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="text"
              name="stripeDisplayName"
              placeholder="Display Name"
              value={stripeDisplayName}
            />
          </div>
        </div>
      </Card.Session>

      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Publishable Key</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="text"
              name="stripePublishableKey"
              placeholder="Publishable Key"
              value={stripePublishableKey}
            />
          </div>
        </div>
      </Card.Session>

      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Secret Key</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="text"
              name="stripeSecretKey"
              placeholder="Secret Key"
              value={stripeSecretKey}
            />
          </div>
        </div>
      </Card.Session>

      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Webhook Secret Key</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="text"
              name="stripeEndpointSecret"
              placeholder="Secret Key"
              value={stripeEndpointSecret}
              instruction="Your webhook url should be: https://yourdomain.com/api/stripe/webhook"
            />
          </div>
        </div>
      </Card.Session>

      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Payment mode</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="radio"
              name="stripePaymentMode"
              placeholder="Payment Mode"
              value={stripePaymentMode}
              options={[
                { text: 'Authorize only', value: 'authorizeOnly' },
                { text: 'Capture', value: 'capture' }
              ]}
            />
          </div>
        </div>
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'paymentSetting',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      stripeDisplayName
      stripePaymentStatus
      stripePublishableKey
      stripeSecretKey
      stripeEndpointSecret
      stripePaymentMode
    }
  }
`;