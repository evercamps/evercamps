import { del, insert, insertOnUpdate, select, update } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import type { Pool } from 'pg';
import { inTransaction } from '../../../../lib/postgres/inTransaction.js';
import { hookable } from '../../../../lib/util/hookable.js';
import { DEFAULT_ATTRIBUTE_GROUP_ID } from './defaultGroup.js';

// Attribute groups are kinds of product (ADR-0003). A group decides which
// product attributes and variant attributes its products can have.

export { DEFAULT_ATTRIBUTE_GROUP_ID };

/** A request the attribute group rules refuse; the API answers it with 400. */
export class AttributeGroupError extends Error {}

export async function countProductsInGroup(groupId: number, connection: PoolClient | Pool): Promise<number> {
  const row = await select()
    .from('product')
    .select('COUNT(product_id)', 'total')
    .where('group_id', '=', groupId)
    .load(connection);
  return parseInt(String(row?.total ?? 0), 10);
}

export interface AttributeGroupInput {
  group_name?: string;
  // The complete list of attribute ids in the group. Left out = unchanged.
  attributes?: (number | string)[];
}

// The payload schema already allows only positive whole numbers.
const toIds = (values: (number | string)[]): number[] => [...new Set(values.map(Number))];

function groupName(data: AttributeGroupInput): string | undefined {
  if (data.group_name === undefined) return undefined;
  const name = String(data.group_name).trim();
  if (!name) {
    throw new AttributeGroupError('Group name is required');
  }
  return name;
}

// Makes the group's attributes exactly `attributeIds`. Removing a product
// attribute deletes its values on the group's products (database trigger).
// Removing a variant attribute that variants in the group use is refused by
// the database; that error is turned into a message naming the attribute.
async function setGroupAttributes(groupId: number, attributeIds: number[], connection: PoolClient) {
  const current = (await select('attribute_id')
    .from('attribute_group_link')
    .where('group_id', '=', groupId)
    .execute(connection)).map((row) => Number(row.attribute_id));

  const toRemove = current.filter((id) => !attributeIds.includes(id));
  const toAdd = attributeIds.filter((id) => !current.includes(id));

  // Names first: once the database refuses a delete, the transaction is
  // aborted and can't be queried any more.
  const names = new Map<number, string>(
    toRemove.length > 0
      ? (await select('attribute_id', 'attribute_name')
          .from('attribute')
          .where('attribute_id', 'IN', toRemove)
          .execute(connection)).map((row) => [Number(row.attribute_id), String(row.attribute_name)])
      : []
  );

  for (const attributeId of toRemove) {
    try {
      await del('attribute_group_link')
        .where('group_id', '=', groupId)
        .and('attribute_id', '=', attributeId)
        .execute(connection);
    } catch (e) {
      if (e instanceof Error && e.message.includes('VARIANT_ATTRIBUTE_IN_USE')) {
        throw new AttributeGroupError(
          `"${names.get(attributeId) ?? attributeId}" is used by variants of products in this group and can't be removed`
        );
      }
      throw e;
    }
  }

  if (toAdd.length > 0) {
    const found = await select('attribute_id')
      .from('attribute')
      .where('attribute_id', 'IN', toAdd)
      .execute(connection);
    if (found.length !== toAdd.length) {
      throw new AttributeGroupError('One of the attributes does not exist');
    }
    for (const attributeId of toAdd) {
      await insertOnUpdate('attribute_group_link', ['attribute_id', 'group_id'])
        .given({ attribute_id: attributeId, group_id: groupId })
        .execute(connection);
    }
  }
}

async function loadGroup(uuid: string, connection: PoolClient) {
  const group = await select().from('attribute_group').where('uuid', '=', uuid).load(connection);
  if (!group) {
    throw new AttributeGroupError('Attribute group not found');
  }
  return group;
}

async function createAttributeGroupFunc(data: AttributeGroupInput) {
  const name = groupName(data);
  if (!name) {
    throw new AttributeGroupError('Group name is required');
  }
  return inTransaction(async (connection) => {
    const result = await insert('attribute_group').given({ group_name: name }).execute(connection);
    if (data.attributes !== undefined) {
      await setGroupAttributes(result.insertId, toIds(data.attributes), connection);
    }
    return select().from('attribute_group').where('attribute_group_id', '=', result.insertId).load(connection);
  });
}

async function updateAttributeGroupFunc(uuid: string, data: AttributeGroupInput) {
  const name = groupName(data);
  return inTransaction(async (connection) => {
    const group = await loadGroup(uuid, connection);
    if (name !== undefined) {
      await update('attribute_group')
        .given({ group_name: name, updated_at: new Date() })
        .where('attribute_group_id', '=', group.attribute_group_id)
        .execute(connection);
    }
    if (data.attributes !== undefined) {
      await setGroupAttributes(group.attribute_group_id, toIds(data.attributes), connection);
    }
    return select().from('attribute_group').where('attribute_group_id', '=', group.attribute_group_id).load(connection);
  });
}

// The default group and groups that still have products can't be deleted
// (the database refuses both too; this gives a clear message).
async function deleteAttributeGroupFunc(uuid: string) {
  return inTransaction(async (connection) => {
    const group = await loadGroup(uuid, connection);
    if (Number(group.attribute_group_id) === DEFAULT_ATTRIBUTE_GROUP_ID) {
      throw new AttributeGroupError('The default attribute group can not be deleted');
    }
    const products = await countProductsInGroup(group.attribute_group_id, connection);
    if (products > 0) {
      throw new AttributeGroupError(
        `This attribute group still has ${products} product${products === 1 ? '' : 's'}. Move them to another group first.`
      );
    }
    await del('attribute_group').where('attribute_group_id', '=', group.attribute_group_id).execute(connection);
    return group;
  });
}

export const createAttributeGroup = (data: AttributeGroupInput, context: Record<string, unknown> = {}) =>
  hookable(createAttributeGroupFunc, context)(data);

export const updateAttributeGroup = (uuid: string, data: AttributeGroupInput, context: Record<string, unknown> = {}) =>
  hookable(updateAttributeGroupFunc, context)(uuid, data);

export const deleteAttributeGroup = (uuid: string, context: Record<string, unknown> = {}) =>
  hookable(deleteAttributeGroupFunc, context)(uuid);
