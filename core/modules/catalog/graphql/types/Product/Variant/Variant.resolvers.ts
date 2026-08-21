import { select } from '@evershop/postgres-query-builder';
import uniqid from 'uniqid';
import { buildUrl } from '../../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../../lib/util/camelCase.js';
import { getProductsBaseQuery } from '../../../../services/getProductsBaseQuery.js';
import type { Pool } from 'pg';

interface Product {
  variantGroupId?: number | null;
}

interface Context {
  pool: Pool;
  user?: unknown;
}

interface VariantGroup {
  uuid: string;
  attribute_one: number | null;
  attribute_two: number | null;
  attribute_three: number | null;
  attribute_four: number | null;
  attribute_five: number | null;
}

interface VariantRow {
  product_id: number;
  attribute_id: number;
  attribute_code: string;
  attribute_name: string;
  option_id: number;
  option_text: string;
}

interface Attribute {
  attribute_id: number;
  attribute_code: string;
  attribute_name: string;
}

export default {
  Product: {
    variantGroup: async (
      product: Product,
      _: unknown,
      { pool, user }: Context
    ) => {
      const { variantGroupId } = product;

      if (!variantGroupId) {
        return null;
      }

      const group = (await select()
        .from('variant_group')
        .select('uuid')
        .select('attribute_one')
        .select('attribute_two')
        .select('attribute_three')
        .select('attribute_four')
        .select('attribute_five')
        .where('variant_group_id', '=', variantGroupId)
        .load(pool)) as VariantGroup;

      const attributeIds = Object.values(group).filter((v) =>
        Number.isInteger(v)
      ) as number[];

      const query = select();

      query
        .from('product')
        .select('product.product_id')
        .select('attribute.attribute_id')
        .select('attribute.attribute_code')
        .select('attribute.attribute_name')
        .select('product_attribute_value_index.option_id')
        .select('product_attribute_value_index.option_text');

      query
        .leftJoin('product_attribute_value_index')
        .on(
          'product.product_id',
          '=',
          'product_attribute_value_index.product_id'
        );

      query
        .leftJoin('attribute')
        .on(
          'product_attribute_value_index.attribute_id',
          '=',
          'attribute.attribute_id'
        );

      query.where('variant_group_id', '=', variantGroupId);
      query.andWhere(
        'product_attribute_value_index.attribute_id',
        'IN',
        attributeIds
      );

      if (!user) {
        query.andWhere('status', '=', 1);
      }

      query.orderBy(
        'product_attribute_value_index.option_id',
        'ASC'
      );

      const vs = (await query.execute(pool)) as VariantRow[];

      const attributes = (await select()
        .from('attribute')
        .where('attribute_id', 'IN', attributeIds)
        .execute(pool)) as Attribute[];

      return {
        variantGroupId,

        variantAttributes: attributes.map((attribute) => {
          const options = vs
            .filter(
              (v) => v.attribute_id === attribute.attribute_id
            )
            .map((v) => ({
              optionId: v.option_id,
              optionText: v.option_text,
              productId: v.product_id
            }));

          return {
            attributeId: attribute.attribute_id,
            attributeCode: attribute.attribute_code,
            attributeName: attribute.attribute_name,
            options
          };
        }),

        items: () =>
          vs
            .reduce<
              {
                product_id: number;
                attributes: {
                  attributeId: number;
                  attributeCode: string;
                  optionId: number;
                  optionText: string;
                }[];
              }[]
            >((acc, v) => {
              const existing = acc.find(
                (p) => p.product_id === v.product_id
              );

              if (!existing) {
                acc.push({
                  product_id: v.product_id,
                  attributes: [
                    {
                      attributeId: v.attribute_id,
                      attributeCode: v.attribute_code,
                      optionId: v.option_id,
                      optionText: v.option_text
                    }
                  ]
                });
              } else {
                existing.attributes.push({
                  attributeId: v.attribute_id,
                  attributeCode: v.attribute_code,
                  optionId: v.option_id,
                  optionText: v.option_text
                });
              }

              return acc;
            }, [])
            .map((p) => {
              const productAttributes = p.attributes.map(
                (a) => a.attributeCode
              );

              const missingAttributes = attributes
                .filter(
                  (a) =>
                    !productAttributes.includes(
                      a.attribute_code
                    )
                )
                .map((a) => ({
                  attributeId: a.attribute_id,
                  attributeCode: a.attribute_code,
                  optionId: null,
                  optionText: null
                }));

              return {
                productId: p.product_id,
                id: `id-${uniqid()}`,
                attributes: [
                  ...p.attributes,
                  ...missingAttributes
                ].filter((a) => a.attributeCode)
              };
            }),

        addItemApi: buildUrl('addVariantItem', {
          id: group.uuid
        })
      };
    }
  },

  Variant: {
    product: async (
      { productId }: { productId: number },
      _: unknown,
      { pool }: Context
    ) => {
      const query = getProductsBaseQuery();

      query.where('product_id', '=', productId);

      const result = await query.load(pool);

      return result ? camelCase(result) : null;
    }
  }
};