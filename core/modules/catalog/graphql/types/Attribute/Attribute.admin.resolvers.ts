import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { AttributeCollection } from '../../../../../modules/catalog/services/AttributeCollection.js';
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
      })
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