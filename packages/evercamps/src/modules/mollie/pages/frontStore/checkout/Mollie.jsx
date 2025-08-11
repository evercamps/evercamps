import { useCheckout } from '@components/common/context/checkout';
import MollieLogo from '@components/frontStore/mollie/MollieLogo.jsx';
import CheckoutForm from '@components/frontStore/mollie/checkout/CheckoutForm';
import PropTypes from 'prop-types';
import React from 'react';
import smallUnit from 'zero-decimal-currencies';
import createMollieClient from '@mollie/api-client';
import { useCheckoutDispatch } from '@components/common/context/checkout.jsx';

export default function MollieMethod({ createPaymentApi}) {
  return (<p>This is the mollie method</p>);
}

PaypalMethod.propTypes = {
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
