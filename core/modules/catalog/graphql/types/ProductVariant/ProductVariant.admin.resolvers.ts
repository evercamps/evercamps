import { select } from '@evershop/postgres-query-builder';
import type { Pool } from 'pg';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { VARIANT_ATTRIBUTE_TYPES } from '../../../services/attribute/attributeRole.js';
import { countVariantUsage, variantAttributesInUse } from '../../../services/product/productVariants.js';

interface Context {
  pool: Pool;
}

interface ProductVariant {
  productVariantId: number;
  uuid: string;
}

interface Product {
  productId: number;
  uuid: string;
  groupId?: number;
}

export default {
  ProductVariant: {
    options: async (variant: ProductVariant, _: unknown, { pool }: Context) => {
      const query = select(
        'attribute.attribute_id',
        'attribute.attribute_code',
        'attribute.attribute_name',
        'attribute_option.attribute_option_id',
        'attribute_option.option_text'
      ).from('variant_attribute_value');
      query
        .innerJoin('attribute')
        .on('attribute.attribute_id', '=', 'variant_attribute_value.attribute_id');
      query
        .innerJoin('attribute_option')
        .on('attribute_option.attribute_option_id', '=', 'variant_attribute_value.option_id');
      query.where('variant_attribute_value.variant_id', '=', variant.productVariantId);
      const rows = await query.execute(pool);
      return rows.map((row) => ({
        attributeId: row.attribute_id,
        attributeCode: row.attribute_code,
        attributeName: row.attribute_name,
        optionId: row.attribute_option_id,
        optionText: row.option_text
      }));
    },
    usageCount: (variant: ProductVariant) => countVariantUsage(variant.productVariantId),
    updateApi: (variant: ProductVariant) => buildUrl('updateProductVariant', { id: variant.uuid }),
    deleteApi: (variant: ProductVariant) => buildUrl('deleteProductVariant', { id: variant.uuid })
  },
  Product: {
    createVariantApi: (product: Product) => buildUrl('createProductVariant', { id: product.uuid }),
    variantAttributeGroup: async (product: Product, _: unknown, { pool }: Context) => {
      const query = select('attribute_group.attribute_group_id', 'attribute_group.group_name').from('product');
      query
        .innerJoin('attribute_group')
        .on('attribute_group.attribute_group_id', '=', 'product.group_id');
      query.where('product.product_id', '=', product.productId);
      const row = await query.load(pool);
      return row ? { groupId: row.attribute_group_id, groupName: row.group_name } : null;
    },
    attributeGroupLock: async (product: Product) => {
      const names = await variantAttributesInUse(product.productId);
      return names.length > 0
        ? { locked: true, reason: `Variants use ${names.join(', ')}` }
        : { locked: false, reason: null };
    },
    // Variant attributes of the product's attribute group (ADR-0004), plus any
    // attribute its variants already use (e.g. imported "kampweek" outside the
    // group), so existing variants keep showing their options.
    variantAttributes: async (product: Product, _: unknown, { pool }: Context) => {
      const productRow = await select('group_id')
        .from('product')
        .where('product_id', '=', product.productId)
        .load(pool);

      const inGroup = productRow?.group_id
        ? await select('attribute_id')
            .from('attribute_group_link')
            .where('group_id', '=', productRow.group_id)
            .execute(pool)
        : [];
      const usedQuery = select('variant_attribute_value.attribute_id').from('variant_attribute_value');
      usedQuery
        .innerJoin('product_variant')
        .on('product_variant.product_variant_id', '=', 'variant_attribute_value.variant_id');
      usedQuery.where('product_variant.product_id', '=', product.productId);
      const used = await usedQuery.execute(pool);

      const usedIds = new Set(used.map((row) => row.attribute_id));
      const ids = [...new Set([...inGroup.map((row) => row.attribute_id), ...usedIds])];
      if (ids.length === 0) {
        return [];
      }
      const attributes = (
        await select()
          .from('attribute')
          .where('attribute_id', 'IN', ids)
          .and('type', 'IN', VARIANT_ATTRIBUTE_TYPES)
          .execute(pool)
      ).filter((attribute) => attribute.role === 'variant' || usedIds.has(attribute.attribute_id));
      if (attributes.length === 0) {
        return [];
      }
      const options = await select()
        .from('attribute_option')
        .where('attribute_id', 'IN', attributes.map((a) => a.attribute_id))
        .execute(pool);

      return attributes.map((attribute) => ({
        attributeId: attribute.attribute_id,
        attributeCode: attribute.attribute_code,
        attributeName: attribute.attribute_name,
        options: options
          .filter((o) => o.attribute_id === attribute.attribute_id)
          .sort((a, b) => String(a.option_text).localeCompare(String(b.option_text), 'nl', { numeric: true }))
          .map((o) => camelCase(o))
      }));
    }
  }
};
