import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from '@jest/globals';
import pg from 'pg';
import 'dotenv/config';
import migrateCatalog from '../../migration/Version-1.1.6.js';
import migrateCheckout from '../../../checkout/migration/Version-1.1.1.js';

// Database rules from ADR-0003 (attribute group lock and guards) and ADR-0004
// (attribute role). Runs against the Postgres in .env, inside one transaction
// that is always rolled back, so the database is never changed.
//
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
  const result = await client.query(sql, params);
  return result.rows[0] as T;
}

async function hasColumn(table: string, column: string): Promise<boolean> {
  const row = await one(
    `SELECT 1 AS found FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return Boolean(row);
}

// Fixtures: a group "Day camp" with a variant attribute "week" (select) and a
// product attribute "level". A product in that group with one variant.
let groupId: number;
let otherGroupId: number;
let weekId: number;
let weekOptionId: number;
let levelId: number;
let productId: number;
let variantId: number;

async function createAttribute(code: string, type: string, role: string): Promise<number> {
  const row = await one<{ attribute_id: number }>(
    `INSERT INTO attribute (attribute_code, attribute_name, type, is_required, display_on_frontend, role)
     VALUES ($1, $1, $2, false, true, $3) RETURNING attribute_id`,
    [code, type, role]
  );
  return row.attribute_id;
}

describeDb('variant database rules', () => {
  beforeAll(async () => {
    await client.query('BEGIN');
    if (!(await hasColumn('attribute', 'role'))) {
      await migrateCatalog(client);
    }
    if (await hasColumn('cart_item', 'variant_group_id')) {
      await migrateCheckout(client);
    }

    groupId = (await one(`INSERT INTO attribute_group (group_name) VALUES ('Day camp test') RETURNING attribute_group_id`)).attribute_group_id;
    otherGroupId = (await one(`INSERT INTO attribute_group (group_name) VALUES ('Merch test') RETURNING attribute_group_id`)).attribute_group_id;
    weekId = await createAttribute('test_week', 'select', 'variant');
    levelId = await createAttribute('test_level', 'select', 'product');
    weekOptionId = (await one(
      `INSERT INTO attribute_option (attribute_id, attribute_code, option_text) VALUES ($1, 'test_week', 'Week 1') RETURNING attribute_option_id`,
      [weekId]
    )).attribute_option_id;
    await client.query(
      `INSERT INTO attribute_group_link (attribute_id, group_id) VALUES ($1, $3), ($2, $3)`,
      [weekId, levelId, groupId]
    );
    productId = (await one(
      `INSERT INTO product (sku, price, qty, manage_stock, stock_availability, group_id)
       VALUES ('test-variant-rules', 100, 0, false, true, $1) RETURNING product_id`,
      [groupId]
    )).product_id;
    variantId = (await one(
      `INSERT INTO product_variant (product_id, sku, price) VALUES ($1, 'test-variant-rules-1', 100) RETURNING product_variant_id`,
      [productId]
    )).product_variant_id;
  });

  afterAll(async () => {
    await client.query('ROLLBACK');
    await client.end();
  });

  // Every test runs in its own savepoint, so a failing statement or a change
  // made by one test doesn't leak into the next.
  beforeEach(async () => {
    await client.query('SAVEPOINT test');
  });
  afterEach(async () => {
    await client.query('ROLLBACK TO SAVEPOINT test');
  });

  async function giveVariantAWeek() {
    await client.query(
      `INSERT INTO variant_attribute_value (variant_id, attribute_id, option_id) VALUES ($1, $2, $3)`,
      [variantId, weekId, weekOptionId]
    );
  }

  describe('legacy variant_group is gone (ADR-0002)', () => {
    it('drops the variant_group table and the variant_group_id columns', async () => {
      expect(await one(`SELECT to_regclass('variant_group') AS t`)).toEqual({ t: null });
      expect(await hasColumn('product', 'variant_group_id')).toBe(false);
      expect(await hasColumn('cart_item', 'variant_group_id')).toBe(false);
      expect(await hasColumn('order_item', 'variant_group_id')).toBe(false);
    });
  });

  describe('attribute group lock (ADR-0003)', () => {
    it('lets a product change group while no variant has a variant attribute value', async () => {
      await client.query(`UPDATE product SET group_id = $1 WHERE product_id = $2`, [otherGroupId, productId]);
      expect(await one(`SELECT group_id FROM product WHERE product_id = $1`, [productId])).toEqual({ group_id: otherGroupId });
    });

    it('blocks changing the group once a variant has a variant attribute value', async () => {
      await giveVariantAWeek();
      await expect(
        client.query(`UPDATE product SET group_id = $1 WHERE product_id = $2`, [otherGroupId, productId])
      ).rejects.toThrow(/ATTRIBUTE_GROUP_LOCKED.*test_week/);
    });

    it('still allows other product updates once locked', async () => {
      await giveVariantAWeek();
      await client.query(`UPDATE product SET price = 120 WHERE product_id = $1`, [productId]);
      expect(await one(`SELECT price::int AS price FROM product WHERE product_id = $1`, [productId])).toEqual({ price: 120 });
    });
  });

  describe('attribute group guards (ADR-0003)', () => {
    it('blocks deleting a group that still has products', async () => {
      await expect(
        client.query(`DELETE FROM attribute_group WHERE attribute_group_id = $1`, [groupId])
      ).rejects.toThrow();
    });

    it('allows deleting a group without products', async () => {
      await client.query(`DELETE FROM attribute_group WHERE attribute_group_id = $1`, [otherGroupId]);
      expect(await one(`SELECT count(*)::int AS n FROM attribute_group WHERE attribute_group_id = $1`, [otherGroupId])).toEqual({ n: 0 });
    });

    it('still blocks deleting the default group', async () => {
      await expect(client.query(`DELETE FROM attribute_group WHERE attribute_group_id = 1`)).rejects.toThrow();
    });

    it('blocks removing a variant attribute from a group while variants in that group use it', async () => {
      await giveVariantAWeek();
      await expect(
        client.query(`DELETE FROM attribute_group_link WHERE attribute_id = $1 AND group_id = $2`, [weekId, groupId])
      ).rejects.toThrow(/VARIANT_ATTRIBUTE_IN_USE/);
    });

    it('allows removing a variant attribute from a group nobody uses it in', async () => {
      await client.query(`DELETE FROM attribute_group_link WHERE attribute_id = $1 AND group_id = $2`, [weekId, groupId]);
    });

    it('removing a product attribute from a group deletes its product values', async () => {
      const optionId = (await one(
        `INSERT INTO attribute_option (attribute_id, attribute_code, option_text) VALUES ($1, 'test_level', 'Beginner') RETURNING attribute_option_id`,
        [levelId]
      )).attribute_option_id;
      await client.query(
        `INSERT INTO product_attribute_value_index (product_id, attribute_id, option_id, option_text) VALUES ($1, $2, $3, 'Beginner')`,
        [productId, levelId, optionId]
      );
      await client.query(`DELETE FROM attribute_group_link WHERE attribute_id = $1 AND group_id = $2`, [levelId, groupId]);
      expect(await one(
        `SELECT count(*)::int AS n FROM product_attribute_value_index WHERE product_id = $1 AND attribute_id = $2`,
        [productId, levelId]
      )).toEqual({ n: 0 });
    });
  });

  describe('attribute role (ADR-0004)', () => {
    it('defaults new attributes to the product role', async () => {
      const id = (await one(
        `INSERT INTO attribute (attribute_code, attribute_name, type, is_required, display_on_frontend)
         VALUES ('test_default_role', 'x', 'text', false, true) RETURNING attribute_id`
      )).attribute_id;
      expect(await one(`SELECT role FROM attribute WHERE attribute_id = $1`, [id])).toEqual({ role: 'product' });
    });

    it('allows the variant role on select and period attributes', async () => {
      await createAttribute('test_period', 'period', 'variant');
    });

    it('rejects the variant role on other types', async () => {
      await expect(createAttribute('test_text_variant', 'text', 'variant')).rejects.toThrow();
    });

    it('rejects an unknown role', async () => {
      await expect(createAttribute('test_bad_role', 'select', 'both')).rejects.toThrow();
    });

    it('allows changing the role while the attribute has no values', async () => {
      await client.query(`UPDATE attribute SET role = 'product' WHERE attribute_id = $1`, [weekId]);
    });

    it('blocks changing the role once a variant uses the attribute', async () => {
      await giveVariantAWeek();
      await expect(
        client.query(`UPDATE attribute SET role = 'product' WHERE attribute_id = $1`, [weekId])
      ).rejects.toThrow(/ATTRIBUTE_ROLE_LOCKED/);
    });

    it('blocks changing the role once a product has a value for the attribute', async () => {
      await client.query(
        `INSERT INTO product_attribute_value_index (product_id, attribute_id, option_text) VALUES ($1, $2, 'x')`,
        [productId, levelId]
      );
      await expect(
        client.query(`UPDATE attribute SET role = 'variant' WHERE attribute_id = $1`, [levelId])
      ).rejects.toThrow(/ATTRIBUTE_ROLE_LOCKED/);
    });

    it('still allows renaming an attribute that has values', async () => {
      await giveVariantAWeek();
      await client.query(`UPDATE attribute SET attribute_name = 'Week' WHERE attribute_id = $1`, [weekId]);
    });
  });
});
