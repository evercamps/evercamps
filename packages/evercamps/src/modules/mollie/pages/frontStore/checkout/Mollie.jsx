import { useCheckout, useCheckoutDispatch } from '@components/common/context/checkout';
import MollieLogo from '@components/frontStore/mollie/MollieLogo.jsx';
import CheckoutForm from '@components/frontStore/mollie/checkout/CheckoutForm';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import smallUnit from 'zero-decimal-currencies';
import RenderIfTrue from '@components/common/RenderIfTrue';
import { _ } from '../../../../../lib/locale/translate/_.js';

export function Mollie({ createPaymentApi, orderId, orderPlaced }) {
  const [error, setError] = useState('');

  React.useEffect(() => {
    const createPayment = async () => {
      const response = await fetch(createPaymentApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: orderId
        })
      });
      const data = await response.json();
      if (!response.error) {
        const { returnUrl } = data.data;
        // Redirect to Mollie for payment approval
        window.location.href = returnUrl;
      } else {
        setError(response.error.message);
      }
    };

    if (orderPlaced && orderId) {
      createPayment();
    }
  }, [orderPlaced, orderId]);
  return (
    <div>
      {error && <div className="text-critical mb-4">{error}</div>}
      <div className="p-8 text-center border rounded mt-4 border-divider">
        {_('You will be redirected to Mollie')}
      </div>
    </div>
  );
}

Mollie.propTypes = {
  createPaymentApi: PropTypes.string.isRequired,
  orderId: PropTypes.string,
  orderPlaced: PropTypes.bool.isRequired
};

Mollie.defaultProps = {
  orderId: undefined
};

export default function MollieMethod({ createPaymentApi }) {
  const checkout = useCheckout();
  const { placeOrder } = useCheckoutDispatch();

  const { steps, paymentMethods, setPaymentMethods, orderPlaced, orderId } = checkout;

  const selectedPaymentMethod = paymentMethods ?
    paymentMethods.find(paymentMethod => paymentMethod.selected) : undefined;

  React.useEffect(() => {
    const selectedPaymentMethod = paymentMethods.find(
      (paymentMethod) => paymentMethod.selected
    );
    if (
      steps.every((step) => step.isCompleted) &&
      selectedPaymentMethod.code === 'mollie'
    ) {
      placeOrder();
    }
  }, [steps]);

  return (
    <div>
      <div className="flex justify-start items-center gap-4">
        <RenderIfTrue
          condition={
            !selectedPaymentMethod || selectedPaymentMethod.code !== 'mollie'
          }
        >

          <a href="#" onClick={(e) => {
            e.preventDefault();
            setPaymentMethods((previous) =>
              previous.map((paymentMethod) => {
                if (paymentMethod.code === 'mollie') {
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
          }}>
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
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
          </a>
        </RenderIfTrue>
        <RenderIfTrue
          condition={!!selectedPaymentMethod && selectedPaymentMethod.code === 'mollie'}
        >
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
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </RenderIfTrue>
        <div>
          <MollieLogo width={60} />
        </div>
      </div>
      <div>
        <RenderIfTrue
          condition={!!selectedPaymentMethod && selectedPaymentMethod.code === 'mollie'}
        >
          <Mollie
            createPaymentApi={createPaymentApi}
            orderPlaced={orderPlaced}
            orderId={orderId}
          ></Mollie>
        </RenderIfTrue>
      </div>
    </div>
  );
}

MollieMethod.propTypes = {
  createPaymentApi: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'checkoutPaymentMethodmollie',
  sortOrder: 10
};

export const query = `
  query Query {
    createPaymentApi: url(routeId: "mollieCreatePayment")
  }
`;
