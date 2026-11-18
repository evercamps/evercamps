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

export interface FilterableAttribute {
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

  if (allIds.length === 0) {
    return [];
  }

  // Filterable attributes. A product gets an option either directly
  // (product_attribute_value_index) or through one of its variants
  // (variant_attribute_value, e.g. kampweek). Each product counts once per option.
  const { rows: attributeData } = await pool.query<AttributeData>(
    `SELECT a.attribute_name, a.type, a.is_filterable, a.attribute_id,
            a.attribute_code, v.option_id, ao.option_text
       FROM (
         SELECT product_id, attribute_id, option_id
           FROM product_attribute_value_index
          WHERE product_id = ANY($1::int[])
         UNION
         SELECT pv.product_id, vav.attribute_id, vav.option_id
           FROM variant_attribute_value vav
           JOIN product_variant pv ON pv.product_variant_id = vav.variant_id
          WHERE pv.product_id = ANY($1::int[])
       ) v
       JOIN attribute a ON a.attribute_id = v.attribute_id
       JOIN attribute_option ao ON ao.attribute_option_id = v.option_id
      WHERE a.type IN ('select', 'period')
        AND a.is_filterable = TRUE
      ORDER BY a.attribute_id, ao.attribute_option_id`,
    [allIds]
  );

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