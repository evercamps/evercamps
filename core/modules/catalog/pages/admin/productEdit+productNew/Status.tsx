import { Card } from '@components/admin/cms/Card';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import React from 'react';

interface Product {
  status?: number;
  visibility?: number;
  manageRegistrations?: number;
}

interface StatusProps {
  product?: Product | null;
}

const DEFAULT_PRODUCT: Product = {
  status: 1,
  visibility: 1,
  manageRegistrations: 1
};

export default function Status({ product: productProp }: StatusProps) {
  // `product` is `null` (not `undefined`) on the "New Product" page, because
  // `product(id: null)` resolves to null - a destructuring default doesn't
  // catch that.
  const product = productProp ?? DEFAULT_PRODUCT;
  // Current "Manage Registrations" choice, shared with the fields plugins put
  // in the productStatusRegistrations area (e.g. "Fiscal attest", which only
  // applies to registration products) as areaProps.manageRegistrations.
  const [manageRegistrations, setManageRegistrations] = React.useState<number>(
    Number(product.manageRegistrations ?? 1)
  );
  return (
    <Card title="Product status">
      <Card.Session>
        <Field
          id="status"
          name="status"
          value={product.status ?? 1}
          label="Status"
          options={[
            { value: 0, text: 'Disabled' },
            { value: 1, text: 'Enabled' }
          ]}
          type="radio"
        />
      </Card.Session>

      <Card.Session>
        <Field
          id="visibility"
          name="visibility"
          value={product.visibility ?? 1}
          label="Visibility"
          options={[
            { value: 0, text: 'Not visible' },
            { value: 1, text: 'Visible' }
          ]}
          type="radio"
        />
      </Card.Session>

      <Card.Session>
        <Field
          id="manageRegistrations"
          name="manage_registrations"
          value={product.manageRegistrations ?? 1}
          label="Manage Registrations"
          options={[
            { value: 0, text: 'Disabled' },
            { value: 1, text: 'Enabled' }
          ]}
          type="radio"
          onChange={(value: unknown) => setManageRegistrations(Number(value))}
        />
        <Area
          id="productStatusRegistrations"
          noOuter
          manageRegistrations={manageRegistrations}
        />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      status
      visibility
      manageRegistrations
      category {
        value: categoryId
        label: name
      }
    }
  }
`;