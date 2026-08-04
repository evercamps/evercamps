import { MultiSelect } from '@components/form/fields/MultiSelect';
import { Select } from '@components/form/fields/Select';
import React from 'react';

interface OptionValue {
  valueId: number;
  value: string;
  extraPrice: {
    value: number;
    text: string;
  };
}

interface ProductOption {
  optionId: number;
  isRequired: number;
  optionName: string;
  optionType: string;
  values: OptionValue[];
}

interface OptionsProps {
  options?: ProductOption[];
}

export default function Options({ options = [] }: OptionsProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="product-single-options mt-16 mb-16">
      <div className="product-single-options-title mb-8">
        <strong>Options</strong>
      </div>

      {options.map((o, i) => {
        const values = o.values.map((v) => ({
          value: v.valueId,
          text: `${v.value} (+ ${v.extraPrice.text})`
        }));

        switch (o.optionType) {
          case 'select':
            return (
              <Select
                key={i}
                name={`product_custom_options[${o.optionId}][]`}
                options={values}
                label={o.optionName}
              />
            );

          case 'multiselect':
            return (
              <MultiSelect
                key={i}
                name={`product_custom_options[${o.optionId}][]`}
                options={values}
                label={o.optionName}
              />
            );

          default:
            return (
              <Select
                key={i}
                name={`product_custom_options[${o.optionId}][]`}
                options={values}
                label={o.optionName}
              />
            );
        }
      })}
    </div>
  );
}

export const layout = {
  areaId: 'productPageMiddleRight',
  sortOrder: 30
};

export const query = `
  query Query {
    product (id: getContextValue('productId')) {
      options {
        optionId
        isRequired
        optionName
        optionType
        values {
          valueId
          value
          extraPrice {
            value
            text
          }
        }
      }
    }
  }
`;