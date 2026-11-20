import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import pg from 'pg';
import 'dotenv/config';

// Which attributes a variant's options may use (ADR-0004): only variant
// attributes of the product's attribute group, or attributes the product's
// variants already use.
//
// Runs against the Postgres in .env, which must be migrated (catalog 1.1.6).
// Creates its own fixtures and deletes them afterwards.
// Opt-in: RUN_DB_TESTS=1. Skipped otherwise (and when the DB can't be reached).

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function canConnect(): Promise<boolean> {
  if (process.env.RUN_DB_TESTS !== '1') return false;
  try {
    await client.connect();
    return true;
  } catch {
    return false;
  }
}

const dbAvailable = await canConnect();
const describeDb = dbAvailable ? describe : describe.skip;

async function one<T = any>(sql: string, params: unknown[] = []): Promise<T> {
  return (await client.query(sql, params)).rows[0] as T;
}

const suffix = `t${Date.now()}`;
let groupId: number;
let productUuid: string;
const attributeIds: number[] = [];

async function createAttributeWithOption(code: string, role: string, inGroup: boolean) {
  const attribute = await one<{ attribute_id: number }>(
    `INSERT INTO attribute (attribute_code, attribute_name, type, is_required, display_on_frontend, role)
     VALUES ($1, $1, 'select', false, true, $2) RETURNING attribute_id`,
    [`${code}_${suffix}`, role]
  );
  attributeIds.push(attribute.attribute_id);
  const option = await one<{ attribute_option_id: number }>(
    `INSERT INTO attribute_option (attribute_id, attribute_code, option_text) VALUES ($1, $2, 'A') RETURNING attribute_option_id`,
    [attribute.attribute_id, `${code}_${suffix}`]
  );
  if (inGroup) {
    await client.query(`INSERT INTO attribute_group_link (attribute_id, group_id) VALUES ($1, $2)`, [
      attribute.attribute_id,
      groupId
    ]);
  }
  return { attribute_id: attribute.attribute_id, option_id: option.attribute_option_id };
}

describeDb('variant options', () => {
  let createProductVariant: typeof import('../../services/product/productVariants.js').createProductVariant;
  let week: { attribute_id: number; option_id: number };
  let level: { attribute_id: number; option_id: number };
  let otherGroupWeek: { attribute_id: number; option_id: number };
  let skuCounter = 0;
  const nextSku = () => `${suffix}-${(skuCounter += 1)}`;

  beforeAll(async () => {
    ({ createProductVariant } = await import('../../services/product/productVariants.js'));
    groupId = (await one(`INSERT INTO attribute_group (group_name) VALUES ($1) RETURNING attribute_group_id`, [
      `Variant options ${suffix}`
    ])).attribute_group_id;
    week = await createAttributeWithOption('week', 'variant', true);
    level = await createAttributeWithOption('level', 'product', true);
    otherGroupWeek = await createAttributeWithOption('age', 'variant', false);
    productUuid = (await one(
      `INSERT INTO product (sku, price, group_id) VALUES ($1, 100, $2) RETURNING uuid`,
      [suffix, groupId]
    )).uuid;
  });

  afterAll(async () => {
    await client.query(`DELETE FROM product WHERE uuid = $1`, [productUuid]);
    await client.query(`DELETE FROM attribute WHERE attribute_id = ANY($1)`, [attributeIds]);
    await client.query(`DELETE FROM attribute_group WHERE attribute_group_id = $1`, [groupId]);
    await client.end();
    const { pool } = await import('../../../../lib/postgres/connection.js');
    await pool.end();
  });

  it('accepts a variant attribute of the product\'s attribute group', async () => {
    const variant = await createProductVariant(productUuid, {
      sku: nextSku(),
      price: 100,
      options: [{ attribute_id: week.attribute_id, option_id: week.option_id }]
    });
    expect(variant.sku).toMatch(suffix);
  });

  it('rejects a product attribute as a variant option', async () => {
    await expect(
      createProductVariant(productUuid, {
        sku: nextSku(),
        price: 100,
        options: [{ attribute_id: level.attribute_id, option_id: level.option_id }]
      })
    ).rejects.toThrow(/not a variant attribute/);
  });

  it('rejects a variant attribute outside the product\'s attribute group', async () => {
    await expect(
      createProductVariant(productUuid, {
        sku: nextSku(),
        price: 100,
        options: [{ attribute_id: otherGroupWeek.attribute_id, option_id: otherGroupWeek.option_id }]
      })
    ).rejects.toThrow(/not in the attribute group/);
  });
});
