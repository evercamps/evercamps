import { Field } from '@components/form/Field';
import { validator } from '@components/form/validator';
import React from 'react';
import { _ } from '@evercamps/evercamps/lib/locale/translate/_';
import { isValidNationalNumber } from '../../../lib/nationalNumber.js';

// Checkout (payment step, right above "Place Order"): the payer's national
// number for the fiscal attest. Shown when the cart has a camp eligible for a
// fiscal attest; required unless "not a Belgian national" is ticked.
// Posted with the billing address form and saved by
// api/addCartAddress/[escapeHtml]savePayerNationalNumber[saveAddress].ts on
// the cart and on the logged-in customer.

interface Props {
  cart?: {
    payerNationalNumber?: string | null;
    payerNationalNumberNotApplicable?: boolean | null;
    needsPayerNationalNumber?: boolean;
  } | null;
  customer?: { nationalNumber?: string | null } | null;
}

function format(value?: string | null): string {
  const d = String(value ?? '').replace(/\D/g, '');
  return d.length === 11
    ? `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}-${d.slice(6, 9)}.${d.slice(9)}`
    : String(value ?? '');
}

export default function PayerNationalNumber({ cart, customer }: Props) {
  const [notApplicable, setNotApplicable] = React.useState(!!cart?.payerNationalNumberNotApplicable);
  // The rule reads the ref so ticking the box takes effect immediately.
  const notApplicableRef = React.useRef(notApplicable);
  notApplicableRef.current = notApplicable;

  React.useEffect(() => {
    validator.addRule(
      'payerNationalNumber',
      (value: unknown) => notApplicableRef.current || isValidNationalNumber(value),
      _('Please enter a valid Belgian national number')
    );
  }, []);

  if (!cart?.needsPayerNationalNumber) {
    return null;
  }

  return (
    <div className="payer-national-number mb-8">
      <h4 className="mb-4 mt-12">{_('Fiscal attest')}</h4>
      <p className="text-sm text-textSubdued mb-4">
        {_('Your national number is needed for the fiscal attest for childcare costs.')}
      </p>
      <Field
        type="text"
        name="payer_national_number"
        label={_('Your national number (rijksregisternummer)')}
        placeholder="YY.MM.DD-XXX.XX"
        value={format(cart.payerNationalNumber || customer?.nationalNumber)}
        validationRules={['payerNationalNumber']}
        disabled={notApplicable}
      />
      <Field
        type="checkbox"
        name="payer_national_number_not_applicable"
        label={_('I am not a Belgian national')}
        value="1"
        isChecked={notApplicable}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotApplicable(e.target.checked)}
      />
    </div>
  );
}

export const layout = {
  areaId: 'beforePlaceOrderButton',
  sortOrder: 5
};

export const query = `
  query Query {
    cart {
      payerNationalNumber
      payerNationalNumberNotApplicable
      needsPayerNationalNumber
    }
    customer: currentCustomer {
      nationalNumber
    }
  }
`;
