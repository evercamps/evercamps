import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import type { PoolClient } from '@evershop/postgres-query-builder';
import pg from 'pg';
import 'dotenv/config';
import migrateVariantMemberPrice from '../../migration/Version-1.1.7.js';
import migrateProductMemberPrice from '../../migration/Version-1.1.8.js';
import { ensureDefaultVariant, syncDefaultVariant } from '../../services/product/defaultVariant.js';

// Member price on the product (#209): a simple product mirrors it into its
// default variant, like its price. A product with variants is left alone.
// Runs against the Postgres in .env, inside one transaction that is always
// rolled back, so the database is never changed.
//
// Opt-in: RUN_DB_TESTS=1. Skipped otherwise (and when the DB can't be reached).

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
const connection = client as unknown as PoolClient;

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

interface ProductRow {
  product_id: number;
  sku: string;
  price: string;
  member_price: string | null;
}

async function createProduct(sku: string, type: string, memberPrice: number | null): Promise<ProductRow> {
  return one<ProductRow>(
    `INSERT INTO product (sku, price, member_price, type) VALUES ($1, 230, $2, $3)
     RETURNING product_id, sku, price, member_price`,
    [sku, memberPrice, type]
  );
}

async function defaultVariantMemberPrice(productId: number): Promise<number | null> {
  const row = await one<{ member_price: string | null }>(
    `SELECT member_price FROM product_variant WHERE product_id = $1 AND is_default = true`,
    [productId]
  );
  return row.member_price === null ? null : parseFloat(row.member_price);
}

describeDb('product member price and the default variant (#209)', () => {
  beforeAll(async () => {
    await client.query('BEGIN');
    await migrateVariantMemberPrice(client);
    await migrateProductMemberPrice(client);
  });

  afterAll(async () => {
    await client.query('ROLLBACK');
    await client.end();
  });

  // Every test runs in its own savepoint
  beforeEach(async () => {
    await client.query('SAVEPOINT test');
  });
  afterEach(async () => {
    await client.query('ROLLBACK TO SAVEPOINT test');
  });

  it('a new default variant starts with the product member price', async () => {
    const product = await createProduct('test-209-new', 'simple', 210);
    await ensureDefaultVariant(
      { sku: product.sku, price: 230, member_price: 210, qty: 5 },
      product.product_id,
      connection
    );
    expect(await defaultVariantMemberPrice(product.product_id)).toBe(210);
  });

  it('a new default variant has no member price when the product has none', async () => {
    const product = await createProduct('test-209-none', 'simple', null);
    await ensureDefaultVariant(
      { sku: product.sku, price: 230, member_price: null, qty: 5 },
      product.product_id,
      connection
    );
    expect(await defaultVariantMemberPrice(product.product_id)).toBeNull();
  });

  it('saving a simple product sets and clears the default variant member price', async () => {
    const product = await createProduct('test-209-sync', 'simple', null);
    await ensureDefaultVariant({ sku: product.sku, price: 230, qty: 5 }, product.product_id, connection);

    await syncDefaultVariant({ member_price: 200 }, product, connection);
    expect(await defaultVariantMemberPrice(product.product_id)).toBe(200);

    // An update without a member price leaves it alone
    await syncDefaultVariant({ price: 240 }, product, connection);
    expect(await defaultVariantMemberPrice(product.product_id)).toBe(200);

    await syncDefaultVariant({ member_price: null }, product, connection);
    expect(await defaultVariantMemberPrice(product.product_id)).toBeNull();
  });

  it('a product with variants keeps the member prices of its variants', async () => {
    const product = await createProduct('test-209-configurable', 'configurable', 210);
    await client.query(
      `INSERT INTO product_variant (product_id, sku, price, member_price, is_default)
       VALUES ($1, 'test-209-configurable-default', 230, 190, true)`,
      [product.product_id]
    );
    await syncDefaultVariant({ member_price: 180 }, product, connection);
    expect(await defaultVariantMemberPrice(product.product_id)).toBe(190);
  });
});
