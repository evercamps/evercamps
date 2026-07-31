import { Pool, select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../lib/util/camelCase.js';

interface Attribute {
  attributeId: number;
}

interface Context {
  pool: Pool;
}

export default {
  Query: {
    attribute: async (
      _: unknown,
      { id }: { id: number },
      { pool }: Context
    ) => {
      const attribute = await select()
        .from('attribute')
        .where('attribute_id', '=', id)
        .load(pool);

      if (!attribute) {
        return null;
      }

      return camelCase(attribute);
    }
  },

  Attribute: {
    options: async (
      attribute: Attribute,
      _: unknown,
      { pool }: Context
    ) => {
      const results = await select()
        .from('attribute_option')
        .where('attribute_id', '=', attribute.attributeId)
        .execute(pool);

      return results.map((result) => camelCase(result));
    }
  }
};