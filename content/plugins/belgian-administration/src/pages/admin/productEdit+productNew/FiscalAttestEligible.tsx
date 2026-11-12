import { Field } from '@components/form/Field';
import React from 'react';

// "Fiscal attest" on the admin product form, in the Status card right under
// "Manage Registrations" (core area productStatusRegistrations). A fiscal
// attest is only possible for products that manage registrations, so the
// choice is disabled - and saved as "No" - while registrations are off.
//
// Posted with the product form as fiscal_attest_eligible; core
// createProduct/updateProduct save it to product.fiscal_attest_eligible
// (plugin migration Version-1.3.0). bootstrap.ts enforces the same rule
// server-side.

interface Props {
  product?: { fiscalAttestEligible?: number | boolean | null } | null;
  areaProps?: { manageRegistrations?: number };
}

export default function FiscalAttestEligible({ product, areaProps }: Props) {
  // product is null on the "New Product" page; new products default to "No".
  const saved = product?.fiscalAttestEligible ? 1 : 0;
  const registrationsEnabled = Number(areaProps?.manageRegistrations ?? 1) === 1;

  if (!registrationsEnabled) {
    return (
      <div className="mt-4">
        <label className="block mb-1">Fiscal attest (281.86)</label>
        <input type="hidden" name="fiscal_attest_eligible" value="0" />
        <div className="text-textSubdued">
          Only available when Manage Registrations is enabled.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Field
        id="fiscalAttestEligible"
        name="fiscal_attest_eligible"
        value={saved}
        label="Fiscal attest (281.86)"
        options={[
          { value: 0, text: 'Not eligible' },
          { value: 1, text: 'Eligible' }
        ]}
        type="radio"
      />
    </div>
  );
}

export const layout = {
  areaId: 'productStatusRegistrations',
  sortOrder: 10
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      fiscalAttestEligible
    }
  }
`;
