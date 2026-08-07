import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/form/Field';
import PropTypes from 'prop-types';
import React from 'react';

export default function Status({ product = {
  status: 1,
  visibility: 1,
  type: 'camp',
  isVirtual: 0
} }) {
  return (
    <Card title="Product status" subdued>
      <Card.Session>
        <Field
          id="status"
          name="status"
          value={product?.status === undefined ? 1 : product.status}
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
          value={product?.visibility === undefined ? 1 : product.visibility}
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
          id="type"
          name="type"
          value={product?.type === undefined ? 'camp' : product.type}
          label="Product Type"
          options={[
            { value: 'simple', text: 'Simple product' },
            { value: 'camp', text: 'Camp (requires registration)' }
          ]}
          type="radio"
        />
      </Card.Session>
      <Card.Session>
        <Field
          id="isVirtual"
          name="is_virtual"
          value={product?.isVirtual === undefined ? 0 : product.isVirtual}
          label="Shipping"
          options={[
            { value: 0, text: 'Requires shipping' },
            { value: 1, text: "Virtual (doesn't require shipping)" }
          ]}
          type="radio"
        />
      </Card.Session>
    </Card>
  );
}

Status.propTypes = {
  product: PropTypes.shape({
    status: PropTypes.number.isRequired,
    visibility: PropTypes.number.isRequired,
    type: PropTypes.string,
    isVirtual: PropTypes.number
  })
};

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      status
      visibility
      type
      isVirtual
      category {
        value: categoryId
        label: name
      }
    }
  }
`;
