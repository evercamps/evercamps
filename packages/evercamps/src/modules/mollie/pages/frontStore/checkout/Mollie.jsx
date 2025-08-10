import { useCheckout } from '@components/common/context/checkout';
import MollieLogo from '@components/frontStore/mollie/MollieLogo.jsx';
import CheckoutForm from '@components/frontStore/mollie/checkout/CheckoutForm';
import PropTypes from 'prop-types';
import React from 'react';
import smallUnit from 'zero-decimal-currencies';
import createMollieClient from '@mollie/api-client';

// Make sure to call loadMollie outside of a component’s render to avoid
// recreating the MollieClient on every render.
// loadMollie is initialized with your real test publishable API key.
let mollie;
const mollieLoader = (mode, testApiKey, liveApiKey) => {
  if (!mollie) {
    mollie = createMollieClient({ apiKey: mode ? liveApiKey : testApiKey });(liveApiKey);
  }
  return mollie;
};

function MollieApp({
  total,
  currency,
  stripePublishableKey,
  returnUrl,
  createPaymentIntentApi,
  stripePaymentMode
}) {
  const options = {
    mode: 'payment',
    currency: currency.toLowerCase(),
    amount: Number(smallUnit(total, currency)),
    capture_method:
      stripePaymentMode === 'capture' ? 'automatic_async' : 'manual'
  };
  return (
    <div className="stripe__app">
      <Elements mollie={mollieLoader(molliePaymentMode, mollieTestApiKey, mollieLiveApiKey)} options={options}>
        <CheckoutForm
          stripePublishableKey={stripePublishableKey}
          returnUrl={returnUrl}
          createPaymentIntentApi={createPaymentIntentApi}
        />
      </Elements>
    </div>
  );
}

MollieApp.propTypes = {
  mollieLiveApiKey: PropTypes.string.isRequired,
  mollieTestApiKey: PropTypes.string.isRequired,
  returnUrl: PropTypes.string.isRequired,
  createPaymentApi: PropTypes.string.isRequired,
  molliePaymentMode: PropTypes.string.isRequired,
  total: PropTypes.number.isRequired,
  currency: PropTypes.string.isRequired
};

export default function MollieMethod({
  setting,
  cart: { grandTotal, currency },
  returnUrl,
  createPaymentApi
}) {
  const checkout = useCheckout();
  const { paymentMethods, setPaymentMethods } = checkout;
  // Get the selected payment method
  const selectedPaymentMethod = paymentMethods
    ? paymentMethods.find((paymentMethod) => paymentMethod.selected)
    : undefined;

  return (
    <div>
      <div className="flex justify-start items-center gap-4">
        {(!selectedPaymentMethod ||
          selectedPaymentMethod.code !== 'mollie') && (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPaymentMethods((previous) =>
                previous.map((paymentMethod) => {
                  if (paymentMethod.code === 'stripe') {
                    return {
                      ...paymentMethod,
                      selected: true
                    };
                  } else {
                    return {
                      ...paymentMethod,
                      selected: false
                    };
                  }
                })
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
        {selectedPaymentMethod && selectedPaymentMethod.code === 'mollie' && (
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
          <MollieLogo width={100} />
        </div>
      </div>
      <div>
        {selectedPaymentMethod && selectedPaymentMethod.code === 'mollie' && (
          <div className="mt-5">
            <MollieApp
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
    </div>
  );
}

MollieMethod.propTypes = {
  setting: PropTypes.shape({
    mollieDisplayName: PropTypes.string.isRequired,
    mollieLiveApiKey: PropTypes.string.isRequired,
    mollieTestApiKey: PropTypes.string.isRequired,
    molliePaymentMode: PropTypes.string.isRequired
  }).isRequired,
  cart: PropTypes.shape({
    grandTotal: PropTypes.shape({
      value: PropTypes.number
    }),
    currency: PropTypes.string
  }).isRequired,
  returnUrl: PropTypes.string.isRequired,
  createPayment: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'checkoutPaymentMethodmollie',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      mollieDisplayName
      mollieLiveApiKey
      mollieTestApiKey
      molliePaymentMode
    }
    cart {
      grandTotal {
        value
      }
      currency
    }
    returnUrl: url(routeId: "stripeReturn")
    createPaymentApi: url(routeId: "createPayment")
  }
`;
