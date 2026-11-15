import { commit, getConnection, rollback, select, startTransaction } from '@evershop/postgres-query-builder';
import { pool } from '../core.js';
import { ensureSeasonVariant } from '../lib/importVariants.js';
import { suggestVariant, yearOfLineName, type GuessableVariant } from '../lib/lineNameGuess.js';
import { seasonForDate } from '../lib/season.js';

// Manual mapping of imported WooCommerce order lines without a variant
// (admin page "Unmapped order lines"). WooCommerce keeps a line's name but
// sends product_id = 0 once its product is deleted, so the import can't find
// the week that was booked. The admin picks product + variant once per line
// name; saving stores the rule (woocommerce_line_name_map, also read by the
// order import) and fixes the existing order lines and their registrations.

export interface LineNameMap {
  product_name: string;
  product_id: number;
  product_variant_id: number;
}

export interface VariantChoice extends GuessableVariant {
  productId: number;
  sku: string;
  price: number | null;
}

export interface UnmappedLineGroup {
  productName: string;
  lineCount: number;
  orderCount: number;
  registrationCount: number;
  skus: string[];
  // highest unit price (incl. tax) on the lines, to prefill a new variant's price
  unitPrice: number | null;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  orderNumbers: string[];
  // the product the import found (by name), when exactly one exists
  product: { productId: number; name: string } | null;
  // season of the lines: the year in the name ("Kamp X 2022 - Week 1"), else
  // the season of the order dates when they're all in one (see season.ts)
  year: number | null;
  suggestedVariantId: number | null;
}

export interface MappedLineName {
  productName: string;
  product: { productId: number; name: string };
  variantId: number;
  variantLabel: string;
  lineCount: number;
  updatedAt: string | null;
}

export interface LineMappingOverview {
  unmapped: UnmappedLineGroup[];
  mapped: MappedLineName[];
  variantsByProduct: Record<number, VariantChoice[]>;
}

async function query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await (pool as any).query(sql, params);
  return result.rows as T[];
}

export async function findLineNameMap(productName: string | null | undefined): Promise<LineNameMap | null> {
  if (!productName) {
    return null;
  }
  const row = await select('product_name', 'product_id', 'product_variant_id')
    .from('woocommerce_line_name_map')
    .where('product_name', '=', productName)
    .load(pool);
  return row ?? null;
}

export async function loadVariants(productIds: number[]): Promise<Record<number, VariantChoice[]>> {
  const result: Record<number, VariantChoice[]> = {};
  if (productIds.length === 0) {
    return result;
  }
  const rows = await query(
    `SELECT pv.product_variant_id, pv.product_id, pv.sku, pv.title, pv.price,
            COALESCE(string_agg(
              ao.option_text || COALESCE(' (' || ao.start_date::text || ')', ''),
              ', ' ORDER BY a.attribute_name
            ), '') AS options
     FROM product_variant pv
     LEFT JOIN variant_attribute_value vav ON vav.variant_id = pv.product_variant_id
     LEFT JOIN attribute_option ao ON ao.attribute_option_id = vav.option_id
     LEFT JOIN attribute a ON a.attribute_id = vav.attribute_id
     WHERE pv.product_id = ANY($1)
     GROUP BY pv.product_variant_id
     ORDER BY pv.title NULLS LAST, pv.sku`,
    [productIds]
  );
  for (const row of rows) {
    (result[row.product_id] ??= []).push({
      variantId: row.product_variant_id,
      productId: row.product_id,
      sku: row.sku,
      title: row.title,
      price: row.price === null ? null : Number(row.price),
      options: row.options
    });
  }
  return result;
}

export async function searchProducts(term: string): Promise<{ productId: number; name: string }[]> {
  const rows = await query(
    `SELECT p.product_id, pd.name
     FROM product p
     JOIN product_description pd ON pd.product_description_product_id = p.product_id
     WHERE pd.name ILIKE $1
     ORDER BY pd.name
     LIMIT 25`,
    [`%${term.trim()}%`]
  );
  return rows.map((r) => ({ productId: r.product_id, name: r.name }));
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function getLineMappingOverview(): Promise<LineMappingOverview> {
  // Imported order lines (woocommerce_order_map) without a variant, one row
  // per line name. product_id is 0 when the import found no product.
  const groups = await query(
    `SELECT oi.product_name,
            COUNT(*)::int AS line_count,
            COUNT(DISTINCT oi.order_item_order_id)::int AS order_count,
            COALESCE(SUM(rc.registration_count), 0)::int AS registration_count,
            array_agg(DISTINCT oi.product_sku) AS skus,
            MAX(oi.product_price_incl_tax) AS unit_price,
            array_agg(DISTINCT p.product_id) FILTER (WHERE p.product_id IS NOT NULL) AS product_ids,
            MIN(o.created_at) AS first_order_at,
            MAX(o.created_at) AS last_order_at,
            (array_agg(DISTINCT o.order_number::text ORDER BY o.order_number::text DESC))[1:15] AS order_numbers
     FROM order_item oi
     JOIN "order" o ON o.order_id = oi.order_item_order_id
     JOIN woocommerce_order_map m ON m.order_id = o.order_id
     LEFT JOIN product p ON p.product_id = oi.product_id
     LEFT JOIN (
       SELECT order_item_id, COUNT(*) AS registration_count
       FROM order_item_registration GROUP BY order_item_id
     ) rc ON rc.order_item_id = oi.order_item_id
     WHERE oi.product_variant_id IS NULL
     GROUP BY oi.product_name
     ORDER BY line_count DESC, oi.product_name`
  );

  const mappedRows = await query(
    `SELECT lm.product_name, lm.product_id, lm.product_variant_id, lm.updated_at,
            pd.name AS product_label, pv.title AS variant_title, pv.sku AS variant_sku,
            (SELECT COUNT(*) FROM order_item oi
              WHERE oi.product_name = lm.product_name
                AND oi.product_variant_id = lm.product_variant_id)::int AS line_count
     FROM woocommerce_line_name_map lm
     LEFT JOIN product_description pd ON pd.product_description_product_id = lm.product_id
     LEFT JOIN product_variant pv ON pv.product_variant_id = lm.product_variant_id
     ORDER BY lm.product_name`
  );

  const productIds = new Set<number>();
  for (const g of groups) {
    if (g.product_ids?.length === 1) productIds.add(g.product_ids[0]);
  }
  for (const m of mappedRows) productIds.add(m.product_id);

  const names = productIds.size
    ? await query(
        `SELECT product_description_product_id AS product_id, name FROM product_description
         WHERE product_description_product_id = ANY($1)`,
        [[...productIds]]
      )
    : [];
  const nameById = new Map(names.map((n) => [n.product_id, n.name as string]));
  const variantsByProduct = await loadVariants([...productIds]);

  const unmapped: UnmappedLineGroup[] = groups.map((g) => {
    const productId: number | null = g.product_ids?.length === 1 ? g.product_ids[0] : null;
    const firstSeason = g.first_order_at ? seasonForDate(g.first_order_at) : null;
    const lastSeason = g.last_order_at ? seasonForDate(g.last_order_at) : null;
    const year = yearOfLineName(g.product_name) ?? (firstSeason === lastSeason ? firstSeason : null);
    return {
      productName: g.product_name,
      lineCount: g.line_count,
      orderCount: g.order_count,
      registrationCount: g.registration_count,
      skus: g.skus ?? [],
      unitPrice: g.unit_price === null ? null : Number(g.unit_price),
      firstOrderAt: toIso(g.first_order_at),
      lastOrderAt: toIso(g.last_order_at),
      orderNumbers: g.order_numbers ?? [],
      product: productId ? { productId, name: nameById.get(productId) ?? `#${productId}` } : null,
      year,
      suggestedVariantId: productId
        ? suggestVariant(g.product_name, variantsByProduct[productId] ?? [], year)
        : null
    };
  });

  const mapped: MappedLineName[] = mappedRows.map((m) => ({
    productName: m.product_name,
    product: { productId: m.product_id, name: m.product_label ?? `#${m.product_id}` },
    variantId: m.product_variant_id,
    variantLabel: m.variant_title || m.variant_sku || `#${m.product_variant_id}`,
    lineCount: m.line_count,
    updatedAt: toIso(m.updated_at)
  }));

  return { unmapped, mapped, variantsByProduct };
}

export interface SaveLineMappingInput {
  productName: string;
  productId: number;
  variantId: number;
  // book on this season's version of the chosen week (created when missing)
  season?: number | null;
}

/**
 * Store the mapping of a line name and apply it: every imported order line
 * with that name that has no variant (or still has the previously mapped
 * one) gets the product, variant and the variant's sku; their registrations
 * get the same product and variant.
 */
export async function saveLineMapping(input: SaveLineMappingInput): Promise<{
  variantId: number;
  orderItems: number;
  registrations: number;
}> {
  const productName = String(input.productName ?? '');
  const productId = Number(input.productId);
  let variantId = Number(input.variantId);
  if (!productName) throw new Error('A line name is required');
  if (!productId) throw new Error('Choose a product');
  if (!variantId) throw new Error('Choose a variant');

  const chosen = await select('product_variant_id', 'product_id')
    .from('product_variant')
    .where('product_variant_id', '=', variantId)
    .load(pool);
  if (!chosen || chosen.product_id !== productId) {
    throw new Error('The variant does not belong to the chosen product');
  }

  const season = input.season ? Number(input.season) : null;
  if (season) {
    if (!(season >= 2000 && season <= 2100)) throw new Error('Invalid season year');
    variantId = await ensureSeasonVariant(productId, variantId, season);
  }

  const variant = await select('sku').from('product_variant').where('product_variant_id', '=', variantId).load(pool);
  const previous = await findLineNameMap(productName);

  const connection = await getConnection(pool);
  try {
    await startTransaction(connection);
    await connection.query(
      `INSERT INTO woocommerce_line_name_map (product_name, product_id, product_variant_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_name) DO UPDATE
         SET product_id = EXCLUDED.product_id,
             product_variant_id = EXCLUDED.product_variant_id,
             updated_at = CURRENT_TIMESTAMP`,
      [productName, productId, variantId]
    );
    const items = await connection.query(
      `UPDATE order_item oi
       SET product_id = $1, product_variant_id = $2, product_sku = $3
       FROM woocommerce_order_map m
       WHERE m.order_id = oi.order_item_order_id
         AND oi.product_name = $4
         AND (oi.product_variant_id IS NULL OR oi.product_variant_id = $5::int)
       RETURNING oi.order_item_id`,
      [productId, variantId, variant.sku, productName, previous?.product_variant_id ?? null]
    );
    const orderItemIds = items.rows.map((r: any) => r.order_item_id);
    let registrations = 0;
    if (orderItemIds.length > 0) {
      const regs = await connection.query(
        `UPDATE registration r
         SET registration_product_id = $1, product_variant_id = $2
         FROM order_item_registration oir
         WHERE oir.registration_id = r.registration_id
           AND oir.order_item_id = ANY($3::int[])
         RETURNING r.registration_id`,
        [productId, variantId, orderItemIds]
      );
      registrations = regs.rowCount ?? regs.rows.length;
    }
    await commit(connection);
    return { variantId, orderItems: orderItemIds.length, registrations };
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
