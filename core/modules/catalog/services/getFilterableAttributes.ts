import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { getProductsBaseQuery } from '../../../modules/catalog/services/getProductsBaseQuery.js';
import { getProductsByCategoryBaseQuery } from '../../../modules/catalog/services/getProductsByCategoryBaseQuery.js';

interface AttributeData {
  attribute_name: string;
  type: string;
  is_filterable: number;
  attribute_id: number;
  attribute_code: string;
  option_id: number;
  option_text: string;
}

interface FilterableAttributeOption {
  optionId: number;
  optionText: string;
  productCount: number;
}

interface FilterableAttribute {
  attributeName: string;
  attributeId: number;
  attributeCode: string;
  options: FilterableAttributeOption[];
}

export const getFilterableAttributes = async (
  categoryId: number | null = null
) => {
  const productsQuery = categoryId
    ? await getProductsByCategoryBaseQuery(categoryId, true)
    : getProductsBaseQuery();

  productsQuery.select('product.product_id');

  // Get the list of productIds before applying pagination, sorting...etc
  // Based on this list, we will find all attributes,
  // categories and prices that can appear in the filter table
  const allIds = (await productsQuery.execute(pool)).map(
    (row) => row.product_id
  );

  // Filterable attributes
  const query = select('attribute.attribute_name', 'attribute_name')
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

  for (let i = 0; i < attributeData.length; i += 1) {
    const index = attributes.findIndex(
      (a) => a.attributeCode === attributeData[i].attribute_code
    );

    if (index === -1) {
      attributes.push({
        attributeName: attributeData[i].attribute_name,
        attributeId: attributeData[i].attribute_id,
        attributeCode: attributeData[i].attribute_code,
        options: [
          {
            optionId: attributeData[i].option_id,
            optionText: attributeData[i].option_text,
            productCount: 1
          }
        ]
      });
    } else {
      const idx = attributes[index].options.findIndex(
        (o) =>
          o.optionId === attributeData[i].option_id
      );

      if (idx === -1) {
        attributes[index].options.push({
          optionId: attributeData[i].option_id,
          optionText: attributeData[i].option_text,
          productCount: 1
        });
      } else {
        attributes[index].options[idx].productCount += 1;
      }
    }
  }

  return attributes;
};