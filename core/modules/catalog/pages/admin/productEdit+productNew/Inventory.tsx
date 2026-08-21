import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/form/Field';
import React from 'react';

interface InventoryData {
  qty?: number;
  stockAvailability?: number;
  manageStock?: number;
}

interface Product {
  inventory?: InventoryData;
}

interface InventoryProps {
  product?: Product;
}

export default function Inventory({
  product = {
    inventory: {
      qty: 0,
      stockAvailability: 0,
      manageStock: 0
    }
  }
}: InventoryProps) {
  const inventory = product?.inventory || {};

  return (
    <Card title="Inventory" subdued>
      <Card.Session>
        <Field
          id="manage_stock"
          name="manage_stock"
          value={
            inventory.manageStock === undefined ? 1 : inventory.manageStock
          }
          label="Manage stock?"
          options={[
            { value: 0, text: 'No' },
            { value: 1, text: 'Yes' }
          ]}
          type="radio"
        />
      </Card.Session>

      <Card.Session>
        <Field
          id="stock_availability"
          name="stock_availability"
          value={
            inventory.stockAvailability === undefined
              ? 1
              : inventory.stockAvailability
          }
          label="Stock availability"
          options={[
            { value: 0, text: 'No' },
            { value: 1, text: 'Yes' }
          ]}
          type="radio"
        />
      </Card.Session>

      <Card.Session>
        <Field
          id="qty"
          name="qty"
          value={inventory.qty}
          placeholder="Quantity"
          label="Quantity"
          type="text"
          validationRules={['notEmpty']}
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
    product(id: getContextValue("productId", null)) {
      inventory {
        qty
        stockAvailability
        manageStock
      }
    }
  }
`;