import { select } from '@evershop/postgres-query-builder';
import type { Pool } from 'pg';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { AttributeCollection } from '../../../../../modules/catalog/services/AttributeCollection.js';
import { countProductsInGroup } from '../../../../../modules/catalog/services/attributeGroup/attributeGroupService.js';
import { AttributeGroupCollection } from '../../../../../modules/catalog/services/AttributeGroupCollection.js';
import { getAttributeGroupsBaseQuery } from '../../../../../modules/catalog/services/getAttributeGroupsBaseQuery.js';
import { getAttributesBaseQuery } from '../../../../../modules/catalog/services/getAttributesBaseQuery.js';

interface Filter {
  key: string;
  operation?: string;
  value?: unknown;
}

interface AttributeGroup {
  attributeGroupId: number;
  uuid: string;
}

interface Context {
  pool: Pool;
}

const count = (row: { total: string | number }) => parseInt(String(row.total), 10);

interface Attribute {
  attributeId: number;
  uuid: string;
}

export default {
  Query: {
    attributes: async (
      _: unknown,
      { filters = [] }: { filters?: Filter[] }
    ) => {
      const query = getAttributesBaseQuery();
      const root = new AttributeCollection(query);
      await root.init(filters);
      return root;
    },

    attributeGroups: async (
      _: unknown,
      { filters = [] }: { filters?: Filter[] }
    ) => {
      const query = getAttributeGroupsBaseQuery();
      const root = new AttributeGroupCollection(query);
      await root.init(filters);
      return root;
    },

    attributeGroup: async (_: unknown, { id }: { id?: number | null }, { pool }: Context) => {
      if (!id) {
        return null;
      }
      const group = await getAttributeGroupsBaseQuery()
        .where('attribute_group_id', '=', id)
        .load(pool);
      return group ? camelCase(group) : null;
    }
  },

  AttributeGroup: {
    attributes: async (
      group: AttributeGroup,
      { filters = [] }: { filters?: Filter[] }
    ) => {
      const query = getAttributesBaseQuery();

      query
        .innerJoin('attribute_group_link')
        .on(
          'attribute.attribute_id',
          '=',
          'attribute_group_link.attribute_id'
        );

      query.where(
        'attribute_group_link.group_id',
        '=',
        group.attributeGroupId
      );

      const root = new AttributeCollection(query);
      await root.init(filters);

      return root;
    },

    updateApi: (group: AttributeGroup) =>
      buildUrl('updateAttributeGroup', {
        id: group.uuid
      }),

    deleteApi: (group: AttributeGroup) =>
      buildUrl('deleteAttributeGroup', { id: group.uuid }),

    editUrl: (group: AttributeGroup) =>
      buildUrl('attributeGroupEdit', { id: group.uuid }),

    productCount: (group: AttributeGroup, _: unknown, { pool }: Context) =>
      countProductsInGroup(group.attributeGroupId, pool),

    attributeUsage: async (group: AttributeGroup, _: unknown, { pool }: Context) => {
      const links = await select('attribute_id')
        .from('attribute_group_link')
        .where('group_id', '=', group.attributeGroupId)
        .execute(pool);
      if (links.length === 0) {
        return [];
      }

      const productValues = select('product_attribute_value_index.attribute_id')
        .select('COUNT(product_attribute_value_index.product_attribute_value_index_id)', 'total')
        .from('product_attribute_value_index');
      productValues
        .innerJoin('product')
        .on('product.product_id', '=', 'product_attribute_value_index.product_id');
      productValues.where('product.group_id', '=', group.attributeGroupId);
      productValues.groupBy('product_attribute_value_index.attribute_id');

      const variantValues = select('variant_attribute_value.attribute_id')
        .select('COUNT(variant_attribute_value.variant_attribute_value_id)', 'total')
        .from('variant_attribute_value');
      variantValues
        .innerJoin('product_variant')
        .on('product_variant.product_variant_id', '=', 'variant_attribute_value.variant_id');
      variantValues
        .innerJoin('product')
        .on('product.product_id', '=', 'product_variant.product_id');
      variantValues
        .where('product.group_id', '=', group.attributeGroupId)
        .and('variant_attribute_value.option_id', 'IS NOT NULL', null);
      variantValues.groupBy('variant_attribute_value.attribute_id');

      const [productRows, variantRows] = await Promise.all([
        productValues.execute(pool),
        variantValues.execute(pool)
      ]);
      const byAttribute = (rows: { attribute_id: number; total: string }[]) =>
        new Map(rows.map((row) => [Number(row.attribute_id), count(row)]));
      const products = byAttribute(productRows);
      const variants = byAttribute(variantRows);

      return links.map((link) => ({
        attributeId: Number(link.attribute_id),
        productValueCount: products.get(Number(link.attribute_id)) ?? 0,
        variantValueCount: variants.get(Number(link.attribute_id)) ?? 0
      }));
    }
  },

  Attribute: {
    groups: async (
      attribute: Attribute,
      { filters = [] }: { filters?: Filter[] }
    ) => {
      const query = getAttributeGroupsBaseQuery();

      query
        .innerJoin('attribute_group_link')
        .on(
          'attribute_group.attribute_group_id',
          '=',
          'attribute_group_link.group_id'
        );

      query.where(
        'attribute_group_link.attribute_id',
        '=',
        attribute.attributeId
      );

      const root = new AttributeGroupCollection(query);
      await root.init(filters);

      return root;
    },

    roleLocked: async (attribute: Attribute, _: unknown, { pool }: Context) => {
      const [variantValue, productValue] = await Promise.all([
        select('attribute_id')
          .from('variant_attribute_value')
          .where('attribute_id', '=', attribute.attributeId)
          .and('option_id', 'IS NOT NULL', null)
          .load(pool),
        select('attribute_id')
          .from('product_attribute_value_index')
          .where('attribute_id', '=', attribute.attributeId)
          .load(pool)
      ]);
      return Boolean(variantValue || productValue);
    },

    editUrl: ({ uuid }: Attribute) =>
      buildUrl('attributeEdit', { id: uuid }),

    updateApi: (attribute: Attribute) =>
      buildUrl('updateAttribute', {
        id: attribute.uuid
      }),

    deleteApi: (attribute: Attribute) =>
      buildUrl('deleteAttribute', {
        id: attribute.uuid
      })
  }
};