import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import {
  OK,
  INVALID_PAYLOAD
} from '../../../../lib/util/httpStatus.js';
import createProductFamily from '../../services/family/createProductFamily.js';

export default async (request, response, next) => {
  const { attribute_codes, attribute_group_id } = request.body;
  try {
    const family = await createProductFamily(
      { attribute_codes, attribute_group_id },
      { routeId: request.currentRoute?.id }
    );

    const attributeIds = [
      family.attribute_one,
      family.attribute_two,
      family.attribute_three,
      family.attribute_four,
      family.attribute_five
    ].filter((a) => a !== null);

    const attributes = await select()
      .from('attribute')
      .where('attribute_id', 'in', attributeIds)
      .execute(pool);

    const promises = attributes.map(async (attribute) => {
      const { attribute_id } = attribute;
      const options = await select()
        .from('attribute_option')
        .where('attribute_id', '=', attribute_id)
        .execute(pool);
      return {
        ...attribute,
        options
      };
    });

    const results = await Promise.all(promises);

    family.attributes = results;
    family.addItemApi = buildUrl('addVariantItem', { id: family.uuid });

    response.status(OK);
    response.json({
      data: family
    });
  } catch (e) {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: e.message
      }
    });
  }
};
