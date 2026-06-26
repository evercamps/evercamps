import { useCheckoutSteps, type Step } from '@components/common/context/checkoutSteps';
import axios from 'axios';
import React, { useMemo, useState } from 'react';

interface PaymentMethod {
  [key: string]: unknown;
}

interface CheckoutContextValue {
  steps: Step[] | undefined;
  cartId: string;
  error: string | null;
  orderPlaced: boolean;
  orderId: string | undefined;
  paymentMethods: PaymentMethod[];
  setPaymentMethods: React.Dispatch<React.SetStateAction<PaymentMethod[]>>;
  getPaymentMethods: () => Promise<void>;
  checkoutSuccessUrl: string;
}

interface CheckoutDispatchValue {
  placeOrder: () => Promise<unknown>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const Checkout = React.createContext<CheckoutContextValue | undefined>(undefined);
const CheckoutDispatch = React.createContext<CheckoutDispatchValue | undefined>(undefined);

interface CheckoutProviderProps {
  children: React.ReactNode;
  cartId: string;
  placeOrderAPI: string;
  getPaymentMethodAPI: string;
  checkoutSuccessUrl: string;
}

export function CheckoutProvider({
  children,
  cartId,
  placeOrderAPI,
  getPaymentMethodAPI,
  checkoutSuccessUrl
}: CheckoutProviderProps) {
  const steps = useCheckoutSteps();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const getPaymentMethods = async () => {
    const response = await axios.get(getPaymentMethodAPI);

    if (!response.data.error) {
      setPaymentMethods(response.data.data.methods);
    } else {
      setPaymentMethods([]);
    }
  };

  const contextValue = useMemo<CheckoutContextValue>(
    () => ({
      steps,
      cartId,
      error,
      orderPlaced,
      orderId,
      paymentMethods,
      setPaymentMethods,
      getPaymentMethods,
      checkoutSuccessUrl
    }),
    [steps, cartId, error, orderPlaced, orderId, paymentMethods, checkoutSuccessUrl]
  );

  const placeOrder = async () => {
    try {
      setError(null);
      const response = await axios.post(placeOrderAPI, { cart_id: cartId });
      setOrderPlaced(true);
      setOrderId(response.data.data.uuid);
      return response.data.data;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  };

  const dispatchMethods = useMemo<CheckoutDispatchValue>(() => ({ placeOrder, setError }), []);

  return (
    <CheckoutDispatch value={dispatchMethods}>
      <Checkout value={contextValue}>{children}</Checkout>
    </CheckoutDispatch>
  );
}

export const useCheckout = () => React.useContext(Checkout);
export const useCheckoutDispatch = () => React.useContext(CheckoutDispatch);
