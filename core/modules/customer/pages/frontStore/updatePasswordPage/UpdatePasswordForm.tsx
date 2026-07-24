import { useCheckout } from '@components/context/checkout';
import {
  useCheckoutSteps,
  useCheckoutStepsDispatch
} from '@components/context/checkoutSteps';
import { Edit as EditComponent } from '@components/frontStore/customer/checkout/Edit';
import React from 'react';

import { _ } from '../../../../../lib/locale/translate/_.js';

const Edit = EditComponent as React.ComponentType<any>;

interface Customer {
  email: string;
}

interface Cart {
  customerEmail?: string;
  addContactInfoApi: string;
}

interface ContactInformationStepProps {
  loginUrl: string;
  currentCustomer?: Customer | null;
  cart: Cart;
}

export default function ContactInformationStep({
  cart: { customerEmail, addContactInfoApi },
  currentCustomer = null,
  loginUrl
}: ContactInformationStepProps) {
  const checkout = useCheckout();
  const steps = useCheckoutSteps();
  const checkoutStepsDispatch = useCheckoutStepsDispatch();

  const [email, setEmail] = React.useState(customerEmail ?? '');
  const [display, setDisplay] = React.useState(false);

  if (!checkout || !steps || !checkoutStepsDispatch) {
    return null;
  }

  const { cartId } = checkout;
  const { canStepDisplay, addStep } = checkoutStepsDispatch;

  const step = steps.find((e) => e.id === 'contact') || {
    id: 'contact',
    title: _('Contact information'),
    isCompleted: false
  };

  React.useEffect(() => {
    addStep({
      id: 'contact',
      title: _('Contact information'),
      isCompleted: !!customerEmail,
      preview: customerEmail || '',
      sortOrder: 5,
      editable: !currentCustomer
    });
  }, [addStep, customerEmail, currentCustomer]);

  React.useEffect(() => {
    setDisplay(canStepDisplay(step));
  }, [canStepDisplay, step]);

  if (step.isCompleted) {
    return null;
  }

  return (
    <div className="checkout-contact checkout-step">
      {display && (
        <Edit
          customer={currentCustomer}
          step={step}
          cartId={cartId}
          email={email}
          addContactInfoApi={addContactInfoApi}
          setEmail={setEmail}
          loginUrl={loginUrl}
        />
      )}
    </div>
  );
}

export const layout = {
  areaId: 'checkoutSteps',
  sortOrder: 10
};

export const query = `
  query Query {
    cart {
      customerEmail
      addContactInfoApi
    }
    currentCustomer {
      email
    }
    loginUrl: url(routeId: "login")
  }
`;