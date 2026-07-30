import { insert, select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

interface Attribute {
  attribute_id: number;
  attribute_code: string;
  [key: string]: unknown;
}

interface VariantGroup {
  variant_group_id: number;
  uuid: string;
  [key: string]: unknown;
}

interface AttributeOption {
  [key: string]: unknown;
}

export default async function createVariantGroup(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  const { attribute_codes, attribute_group_id } = request.body;

  try {
    if (attribute_codes.length === 0) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'No attributes provided'
        }
      });
      return;
    }

    if (attribute_codes.length > 5) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'We only support up to 5 attributes'
        }
      });
      return;
    }

    const attributes = (await select()
      .from('attribute')
      .where('attribute_code', 'in', attribute_codes)
      .and('type', '=', 'select')
      .execute(pool)) as Attribute[];

    if (attributes.length !== attribute_codes.length) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Attribute must be of type select'
        }
      });
      return;
    }

    const attributeGroupLinks = await select()
      .from('attribute_group_link')
      .where('group_id', '=', attribute_group_id)
      .and(
        'attribute_id',
        'in',
        attributes.map((a) => a.attribute_id)
      )
      .execute(pool);

    if (attributeGroupLinks.length !== attributes.length) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Attribute must be assigned to the group'
        }
      });
      return;
    }

    const data: Record<string, unknown> = {};

    attributes.forEach((attribute, index) => {
      let column: string | undefined;

      switch (index) {
        case 0:
          column = 'attribute_one';
          break;
        case 1:
          column = 'attribute_two';
          break;
        case 2:
          column = 'attribute_three';
          break;
        case 3:
          column = 'attribute_four';
          break;
        case 4:
          column = 'attribute_five';
          break;
      }

      if (column) {
        data[column] = attribute.attribute_id;
      }
    });

    data.attribute_group_id = attribute_group_id;

    const result = await insert('variant_group')
      .given(data)
      .execute(pool);

    const group = (await select()
      .from('variant_group')
      .where('variant_group_id', '=', result.insertId)
      .load(pool)) as VariantGroup;

    const promises = attributes.map(async (attribute) => {
      const options = (await select()
        .from('attribute_option')
        .where('attribute_id', '=', attribute.attribute_id)
        .execute(pool)) as AttributeOption[];

      return {
        ...attribute,
        options
      };
    });

    const results = await Promise.all(promises);

    group.attributes = results;
    group.addItemApi = buildUrl('addVariantItem', {
      id: group.uuid
    });

    response.status(OK);
    response.json({
      data: group
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : String(e)
      }
    });
  }
}