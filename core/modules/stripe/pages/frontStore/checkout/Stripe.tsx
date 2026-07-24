import { useCheckout } from '@components/context/checkout';
import CheckoutForm from '@components/frontStore/stripe/checkout/CheckoutForm';
import StripeLogo from '@components/frontStore/stripe/StripeLogo';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import React from 'react';
import smallUnit from 'zero-decimal-currencies';
import type { StripeElementsOptions } from '@stripe/stripe-js';

interface StripeAppProps {
  total: number;
  currency: string;
  stripePublishableKey: string;
  returnUrl: string;
  createPaymentIntentApi: string;
  stripePaymentMode: string;
}

interface StripeMethodProps {
  setting: {
    stripeDisplayName: string;
    stripePublishableKey: string;
    stripePaymentMode: string;
  };
  cart: {
    grandTotal: {
      value: number;
    };
    currency: string;
  };
  returnUrl: string;
  createPaymentIntentApi: string;
}

let stripe: Promise<Stripe | null> | undefined;

const stripeLoader = (publishKey: string) => {
  if (!stripe) {
    stripe = loadStripe(publishKey);
  }

  return stripe;
};

function StripeApp({
  total,
  currency,
  stripePublishableKey,
  returnUrl,
  createPaymentIntentApi,
  stripePaymentMode
}: StripeAppProps) {
    const options: StripeElementsOptions = {
    mode: 'payment',
    currency: currency.toLowerCase(),
    amount: Number(smallUnit(total, currency)),
    capture_method:
      stripePaymentMode === 'capture' ? 'automatic_async' : 'manual'
  };

  return (
    <div className="stripe__app">
      <Elements
        stripe={stripeLoader(stripePublishableKey)}
        options={options}
      >
        <CheckoutForm
          stripePublishableKey={stripePublishableKey}
          returnUrl={returnUrl}
          createPaymentIntentApi={createPaymentIntentApi}
        />
      </Elements>
    </div>
  );
}

export default function StripeMethod({
  setting,
  cart: { grandTotal, currency },
  returnUrl,
  createPaymentIntentApi
}: StripeMethodProps) {
  const checkout = useCheckout();
    if (!checkout) {
    return null;
  }

  const { paymentMethods, setPaymentMethods } = checkout;

  const selectedPaymentMethod = paymentMethods?.find(
    (paymentMethod) => paymentMethod.selected
  );

  return (
    <div>
      <div className="flex justify-start items-center gap-4">
        {(!selectedPaymentMethod ||
          selectedPaymentMethod.code !== 'stripe') && (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();

              setPaymentMethods((previous) =>
                previous.map((paymentMethod) => ({
                  ...paymentMethod,
                  selected: paymentMethod.code === 'stripe'
                }))
              );
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-circle"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
          </a>
        )}

        {selectedPaymentMethod?.code === 'stripe' && (
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2c6ecb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-check-circle"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        )}

        <div>
          <StripeLogo width={100} />
        </div>
      </div>

      {selectedPaymentMethod?.code === 'stripe' && (
        <div className="mt-5">
          <StripeApp
            total={grandTotal.value}
            currency={currency}
            stripePublishableKey={setting.stripePublishableKey}
            returnUrl={returnUrl}
            createPaymentIntentApi={createPaymentIntentApi}
            stripePaymentMode={setting.stripePaymentMode}
          />
        </div>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'checkoutPaymentMethodstripe',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      stripeDisplayName
      stripePublishableKey
      stripePaymentMode
    }
    cart {
      grandTotal {
        value
      }
      currency
    }
    returnUrl: url(routeId: "stripeReturn")
    createPaymentIntentApi: url(routeId: "createPaymentIntent")
  }
`;