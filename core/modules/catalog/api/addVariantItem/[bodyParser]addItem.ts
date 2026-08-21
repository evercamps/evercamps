import {
  select,
  update,
  startTransaction,
  commit,
  rollback
} from '@evershop/postgres-query-builder';
import uniqid from 'uniqid';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

interface VariantGroup {
  variant_group_id: number;
  attribute_group_id: number;
  attribute_one: number | null;
  attribute_two: number | null;
  attribute_three: number | null;
  attribute_four: number | null;
  attribute_five: number | null;
}

interface Product {
  product_id: number;
  uuid: string;
  group_id: number;
  variant_group_id?: number | null;
}

interface AttributeValue {
  attribute_id: number;
  attribute_code: string;
  option_id: number;
}

export default async function addProductToVariantGroup(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  const { id: groupId } = request.params;
  const { product_id } = request.body;

  const connection = await getConnection();

  try {
    await startTransaction(connection);

    const group = (await select()
      .from('variant_group')
      .where('uuid', '=', groupId)
      .load(connection, false)) as VariantGroup | null;

    if (!group) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid variant group'
        }
      });
      return;
    }

    const product = (await select()
      .from('product')
      .where('uuid', '=', product_id)
      .and('group_id', '=', group.attribute_group_id)
      .load(connection, false)) as Product | null;

    if (!product) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message:
            'The product is either not exist or using different attribute group'
        }
      });
      return;
    }

    await update('product')
      .given({
        variant_group_id: group.variant_group_id
      })
      .where('uuid', '=', product_id)
      .execute(connection, false);

    const variantAttributeIds = [
      group.attribute_one,
      group.attribute_two,
      group.attribute_three,
      group.attribute_four,
      group.attribute_five
    ].filter((a): a is number => a !== null);

    const query = select().from('product_attribute_value_index');

    query
      .innerJoin('attribute')
      .on(
        'attribute.attribute_id',
        '=',
        'product_attribute_value_index.attribute_id'
      );

    query
      .where(
        'product_attribute_value_index.product_id',
        '=',
        product.product_id
      )
      .and(
        'product_attribute_value_index.attribute_id',
        'in',
        variantAttributeIds
      );

    const attributes = (await query.execute(
      connection,
      false
    )) as AttributeValue[];

    await commit(connection);

    response.status(OK);
    response.json({
      data: {
        id: uniqid(),
        attributes: attributes.map((a) => ({
          attribute_id: a.attribute_id,
          attribute_code: a.attribute_code,
          option_id: a.option_id
        })),
        product
      }
    });
  } catch (e) {
    await rollback(connection);

    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : String(e)
      }
    });
  }
}