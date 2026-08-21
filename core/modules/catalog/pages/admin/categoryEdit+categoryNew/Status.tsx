import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/form/Field';
import React from 'react';

interface Category {
  status?: number;
  includeInNav?: number;
  showProducts?: number;
}

interface StatusProps {
  category?: Category;
}

export default function Status({ category = {} }: StatusProps) {
  return (
    <Card>
      <Card.Session title="Status">
        <Field
          type="radio"
          name="status"
          options={[
            { value: 0, text: 'Disabled' },
            { value: 1, text: 'Enabled' }
          ]}
          value={category.status === undefined ? 1 : category.status}
        />
      </Card.Session>

      <Card.Session title="Include In Store Menu">
        <Field
          type="radio"
          name="include_in_nav"
          options={[
            { value: 0, text: 'No' },
            { value: 1, text: 'Yes' }
          ]}
          value={
            category.includeInNav === undefined
              ? 1
              : category.includeInNav
          }
        />
      </Card.Session>

      <Card.Session title="Show Products?">
        <Field
          type="radio"
          name="show_products"
          options={[
            { value: 0, text: 'No' },
            { value: 1, text: 'Yes' }
          ]}
          value={
            category.showProducts === undefined
              ? 1
              : category.showProducts
          }
        />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
};

export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      status
      includeInNav
      showProducts
    }
  }
`;