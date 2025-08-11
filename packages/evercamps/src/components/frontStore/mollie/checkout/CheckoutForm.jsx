import {
  useCheckout,
  useCheckoutDispatch
} from '@components/common/context/checkout';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

import './CheckoutForm.scss';
import RenderIfTrue from '@components/common/RenderIfTrue';
import Spinner from '@components/common/Spinner';
import { _ } from '../../../../lib/locale/translate/_.js';
import TestCards from './TestCards';
import createMollieClient from '@mollie/api-client';

const cartQuery = `
  query Query($cartId: String) {
    cart(id: $cartId) {
      billingAddress {
        cartAddressId
        fullName
        postcode
        telephone
        country {
          name
          code
        }
        province {
          name
          code
        }
        city
        address1
        address2
      }
      shippingAddress {
        cartAddressId
        fullName
        postcode
        telephone
        country {
          name
          code
        }
        province {
          name
          code
        }
        city
        address1
        address2
      }
      customerEmail
    }
  }
`;

export default function CheckoutForm({
  mollieApiKey,
  createPaymentApi,
  returnUrl
}) {
  const [clientSecret, setClientSecret] = React.useState(null);
  const [showTestCard, setShowTestCard] = useState('success');
  const mollie = createMollieClient({ apiKey: mollieApiKey});
  const elements = useElements();
  const { steps, cartId, orderId, orderPlaced, paymentMethods } = useCheckout();
  const { placeOrder, setError } = useCheckoutDispatch();

  const [result] = useQuery({
    query: cartQuery,
    variables: {
      cartId
    },
    pause: orderPlaced === true
  });

  useEffect(() => {
    const pay = async () => {
      const submit = await elements.submit();
      console.log(submit);
      if (submit.error) {
        setError(submit.error.message);
        return;
      }
      // Place the order
      await placeOrder();
    };
    // If all steps are completed, submit the payment
    if (steps.every((step) => step.isCompleted)) {
      pay();
    }
  }, [steps]);

  useEffect(() => {
    if (orderId && orderPlaced) {
      console.log(orderId, orderPlaced);
      window
        .fetch(createPaymentApi, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ cart_id: cartId, order_id: orderId })
        })
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
          if (data.error) {
            toast.error(_('Some error occurred. Please try again later.'));
          } else {
            setClientSecret(data.data.clientSecret);
          }
        });
    }
  }, [orderId]);

  useEffect(() => {
    const confirmPayment = async () => {
      const billingAddress =
        result.data.cart.billingAddress || result.data.cart.shippingAddress;
      const payload = await mollie.payments.create({
        clientSecret,
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: billingAddress.fullName,
              email: result.data.cart.customerEmail,
              phone: billingAddress.telephone,
              address: {
                line1: billingAddress.address1,
                country: billingAddress.country.code,
                state: billingAddress.province?.code,
                postal_code: billingAddress.postcode,
                city: billingAddress.city
              }
            }
          },
          return_url: `${returnUrl}?order_id=${orderId}`
        }
      });
      if (payload.error) {
        // Get the payment intent ID
        const paymentIntent = payload.error.payment_intent;
        // Redirect to the return URL with the payment intent ID
        window.location.href = `${returnUrl}?order_id=${orderId}&payment_intent=${paymentIntent.id}`;
      }
    };
    if (orderPlaced && clientSecret) {
      confirmPayment();
    }
  }, [orderPlaced, clientSecret]);

  const testSuccess = () => {
    setShowTestCard('success');
  };

  const testFailure = () => {
    setShowTestCard('failure');
  };

  if (result.error) {
    return (
      <div className="flex p-8 justify-center items-center text-critical">
        {result.error.message}
      </div>
    );
  }
  // Check if the selected payment method is Mollie
  const molliePaymentMethod = paymentMethods.find(
    (method) => method.code === 'mollie' && method.selected === true
  );
  if (!molliePaymentMethod) {
    return null;
  }
  return (
    <>
      <RenderIfTrue condition={!!(mollie && elements)}>
        <div>
          <div className="mollie-form">
            {mollieApiKey && (
                <TestCards
                  showTestCard={showTestCard}
                  testSuccess={testSuccess}
                  testFailure={testFailure}
                />
              )}
              <p>Blablabla</p>
            <PaymentElement id="payment-element" />
          </div>
        </div>
      </RenderIfTrue>
      <RenderIfTrue condition={!!(!mollie || !elements)}>
        <div className="flex justify-center p-5">
          <Spinner width={20} height={20} />
        </div>
      </RenderIfTrue>
    </>
  );
}

CheckoutForm.propTypes = {
  mollieApiKey: PropTypes.string.isRequired,
  returnUrl: PropTypes.string.isRequired,
  createPaymentApi: PropTypes.string.isRequired
};
