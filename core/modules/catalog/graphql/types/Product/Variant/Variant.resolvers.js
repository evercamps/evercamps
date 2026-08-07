import { select } from '@evershop/postgres-query-builder';
import uniqid from 'uniqid';
import { buildUrl } from '../../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../../lib/util/camelCase.js';
import { getProductsBaseQuery } from '../../../../services/getProductsBaseQuery.js';

export default {
  Product: {
    variantGroup: async (product, _, { pool, user }) => {
      const { variantGroupId } = product;
      if (!variantGroupId) {
        return null;
      } else {
        const group = await select()
          .from('variant_group')
          .select('uuid')
          .select('attribute_one')
          .select('attribute_two')
          .select('attribute_three')
          .select('attribute_four')
          .select('attribute_five')
          .select('name')
          .select('url_key')
          .select('description')
          .select('short_description')
          .select('meta_title')
          .select('meta_description')
          .select('meta_keywords')
          .select('default_variant_id')
          .where('variant_group_id', '=', variantGroupId)
          .load(pool);

        // Explicit list, not Object.values(group).filter(Number.isInteger) —
        // group now also carries default_variant_id, which is an attribute
        // slot value, not an attribute id.
        const attributeIds = [
          group.attribute_one,
          group.attribute_two,
          group.attribute_three,
          group.attribute_four,
          group.attribute_five
        ].filter((v) => Number.isInteger(v));

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
        query.orderBy('product_attribute_value_index.option_id', 'ASC');
        const vs = await query.execute(pool);
        const attributes = await select()
          .from('attribute')
          .where('attribute_id', 'IN', attributeIds)
          .execute(pool);

        return {
          variantGroupId,
          variantAttributes: attributes.map((a) => {
            // We need to get all the options available from the variants list
            const options = vs
              .filter((v) => v.attribute_id === a.attribute_id)
              .map((v) => ({
                optionId: v.option_id,
                optionText: v.option_text,
                productId: v.product_id
              }));
            return {
              attributeId: a.attribute_id,
              attributeCode: a.attribute_code,
              attributeName: a.attribute_name,
              options
            };
          }),
          items: () =>
            vs
              .reduce((acc, v) => {
                const product = acc.find((p) => p.product_id === v.product_id);
                if (!product) {
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
                  product.attributes.push({
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
                  .filter((a) => !productAttributes.includes(a.attribute_code))
                  .map((a) => ({
                    attributeId: a.attribute_id,
                    attributeCode: a.attribute_code,
                    optionId: null,
                    optionText: null
                  }));
                return {
                  productId: p.product_id,
                  id: `id-${uniqid()}`,
                  attributes: [...p.attributes, ...missingAttributes].filter(
                    (a) => a.attributeCode
                  )
                };
              }),
          addItemApi: buildUrl('addVariantItem', { id: group.uuid }),
          name: group.name,
          urlKey: group.url_key,
          description: group.description,
          shortDescription: group.short_description,
          metaTitle: group.meta_title,
          metaDescription: group.meta_description,
          metaKeywords: group.meta_keywords,
          defaultVariantId: group.default_variant_id
        };
      }
    }
  },
  Variant: {
    product: async ({ productId }, _, { pool }) => {
      const query = getProductsBaseQuery();
      query.where('product_id', '=', productId);
      const result = await query.load(pool);
      if (!result) {
        return null;
      } else {
        return camelCase(result);
      }
    }
  }
};
