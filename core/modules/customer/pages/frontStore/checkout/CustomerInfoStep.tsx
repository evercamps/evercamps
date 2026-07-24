import { useCheckout } from '@components/context/checkout';
import {
  useCheckoutSteps,
  useCheckoutStepsDispatch,
  type Step
} from '@components/context/checkoutSteps';
import { Edit as EditComponent } from '@components/frontStore/customer/checkout/Edit';
import React from 'react';

import { _ } from '../../../../../lib/locale/translate/_.js';

interface Customer {
  email: string;
}

interface Cart {
  customerEmail?: string | null;
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
  const steps = useCheckoutSteps() ?? [];
  const checkout = useCheckout();
  const cartId = checkout?.cartId ?? '';

  const [email, setEmail] = React.useState(customerEmail ?? '');
  const [display, setDisplay] = React.useState(false);

  const checkoutStepsDispatch = useCheckoutStepsDispatch();

  const step: Step = steps.find((e) => e.id === 'contact') ?? {
    id: 'contact',
    title: _('Contact information')
  };

  React.useEffect(() => {
    checkoutStepsDispatch?.addStep({
      id: 'contact',
      title: _('Contact information'),
      previewTitle: _('Contact'),
      isCompleted: !!customerEmail,
      preview: customerEmail || '',
      sortOrder: 5,
      editable: !currentCustomer
    });
  }, [checkoutStepsDispatch, customerEmail, currentCustomer]);

  React.useEffect(() => {
    if (checkoutStepsDispatch) {
      setDisplay(checkoutStepsDispatch.canStepDisplay(step));
    }
  }, [checkoutStepsDispatch, step]);

  if (step.isCompleted) {
    return null;
  }

  const Edit = EditComponent as React.ComponentType<any>;
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