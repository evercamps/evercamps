import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { getProductsByCategoryBaseQuery } from '../../../modules/catalog/services/getProductsByCategoryBaseQuery.js';

interface AttributeOption {
  optionId: number;
  optionText: string;
  productCount: number;
}

interface FilterableAttribute {
  attributeName: string;
  attributeId: number;
  attributeCode: string;
  options: AttributeOption[];
}

interface AttributeData {
  attribute_name: string;
  type: string;
  is_filterable: number;
  attribute_id: number;
  attribute_code: string;
  option_id: number;
  option_text: string;
}

export const getFilterableAttributes = async (
  categoryId: number
): Promise<FilterableAttribute[]> => {
  const productsQuery = await getProductsByCategoryBaseQuery(
    categoryId,
    true
  );

  productsQuery.select('product.product_id');

  // Get the list of productIds before applying pagination, sorting...etc
  // Based on this list, we will find all attributes,
  // category and price can be appeared in the filter table
  const allIds = (await productsQuery.execute(pool)).map(
    (row: { product_id: number }) => row.product_id
  );

  // Filterable attributes
  const query = select(
    'attribute.attribute_name',
    'attribute_name'
  )
    .select('attribute.type', 'type')
    .select('attribute.is_filterable', 'is_filterable')
    .select(
      'product_attribute_value_index.attribute_id',
      'attribute_id'
    )
    .select('attribute.attribute_code', 'attribute_code')
    .select(
      'product_attribute_value_index.option_id',
      'option_id'
    )
    .select(
      'product_attribute_value_index.option_text',
      'option_text'
    )
    .from('attribute');

  query
    .innerJoin('product_attribute_value_index')
    .on(
      'attribute.attribute_id',
      '=',
      'product_attribute_value_index.attribute_id'
    );

  query
    .where(
      'product_attribute_value_index.product_id',
      'IN',
      allIds
    )
    .and('type', '=', 'select')
    .and('is_filterable', '=', 1);

  const attributeData =
    (await query.execute(pool)) as AttributeData[];

  const attributes: FilterableAttribute[] = [];

  for (let i = 0; i < attributeData.length; i++) {
    const data = attributeData[i];

    const index = attributes.findIndex(
      (attribute) =>
        attribute.attributeCode === data.attribute_code
    );

    if (index === -1) {
      attributes.push({
        attributeName: data.attribute_name,
        attributeId: data.attribute_id,
        attributeCode: data.attribute_code,
        options: [
          {
            optionId: data.option_id,
            optionText: data.option_text,
            productCount: 1
          }
        ]
      });
    } else {
      const optionIndex = attributes[index].options.findIndex(
        (option) =>
          Number(option.optionId) === Number(data.option_id)
      );

      if (optionIndex === -1) {
        attributes[index].options.push({
          optionId: data.option_id,
          optionText: data.option_text,
          productCount: 1
        });
      } else {
        attributes[index].options[optionIndex].productCount++;
      }
    }
  }

  return attributes;
};