import { del, insert, select } from '@evershop/postgres-query-builder';
import { createProductVariant, normalizeOptionPeriod, pool } from '../core.js';
import { datesFromLineName, optionTextFromLineName, suggestVariant } from '../lib/lineNameGuess.js';
import { saveLineMapping } from './lineNameMap.js';

// "New variant" popup of the "Unmapped order lines" page: create the variant
// a WooCommerce order line was booked on (and, when needed, its period
// option, e.g. kampweek "Zomer 1 2021" with its dates) on the chosen product,
// and map the line name to it - in one go.

export interface FormOption {
  optionId: number;
  text: string;
  startDate: string | null;
  endDate: string | null;
  dayCount: number | null;
  // a variant of this product already has this option
  usedByProduct: boolean;
}

export interface FormAttribute {
  attributeId: number;
  name: string;
  code: string;
  type: string;
  // the product's variants use this attribute
  usedByProduct: boolean;
  options: FormOption[];
}

export interface VariantForm {
  product: { productId: number; name: string; sku: string };
  // attributes of the product's variants + every period attribute
  attributes: FormAttribute[];
  defaults: { price: number | null; totalSeats: number };
  // prefill from the line name, for the period attribute
  suggestion: {
    attributeId: number | null;
    optionId: number | null;
    newOptionText: string;
    startDate: string | null;
    endDate: string | null;
  };
}

async function query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await (pool as any).query(sql, params);
  return result.rows as T[];
}

/** pg DATE (Date at local midnight) -> YYYY-MM-DD */
function dateString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

export async function getVariantForm(
  productId: number,
  lineName: string | null,
  year: number | null
): Promise<VariantForm> {
  const [product] = await query(
    `SELECT p.product_id, p.sku, pd.name
     FROM product p
     LEFT JOIN product_description pd ON pd.product_description_product_id = p.product_id
     WHERE p.product_id = $1`,
    [productId]
  );
  if (!product) {
    throw new Error('Product not found');
  }

  const used = await query(
    `SELECT DISTINCT vav.attribute_id, vav.option_id
     FROM variant_attribute_value vav
     JOIN product_variant pv ON pv.product_variant_id = vav.variant_id
     WHERE pv.product_id = $1`,
    [productId]
  );
  const usedAttributes = new Set(used.map((u) => u.attribute_id));
  const usedOptions = new Set(used.map((u) => u.option_id));

  const attributes = await query(
    `SELECT attribute_id, attribute_name, attribute_code, type
     FROM attribute
     WHERE attribute_id = ANY($1) OR type = 'period'
     ORDER BY attribute_name`,
    [[...usedAttributes]]
  );
  const options = await query(
    `SELECT attribute_option_id, attribute_id, option_text, start_date, end_date, day_count
     FROM attribute_option
     WHERE attribute_id = ANY($1)
     ORDER BY start_date DESC NULLS LAST, option_text`,
    [attributes.map((a) => a.attribute_id)]
  );

  const formAttributes: FormAttribute[] = attributes.map((a) => ({
    attributeId: a.attribute_id,
    name: a.attribute_name,
    code: a.attribute_code,
    type: a.type,
    usedByProduct: usedAttributes.has(a.attribute_id),
    options: options
      .filter((o) => o.attribute_id === a.attribute_id)
      .map((o) => ({
        optionId: o.attribute_option_id,
        text: o.option_text,
        startDate: dateString(o.start_date),
        endDate: dateString(o.end_date),
        dayCount: o.day_count === null ? null : Number(o.day_count),
        usedByProduct: usedOptions.has(o.attribute_option_id)
      }))
  }));

  const [latest] = await query(
    `SELECT pv.price, ii.total_seats
     FROM product_variant pv
     LEFT JOIN inventory_item ii ON ii.variant_id = pv.product_variant_id
     WHERE pv.product_id = $1
     ORDER BY pv.product_variant_id DESC
     LIMIT 1`,
    [productId]
  );

  // The period attribute: the one the product's variants use, else kampweek,
  // else the first period attribute.
  const periods = formAttributes.filter((a) => a.type === 'period');
  const period =
    periods.find((a) => a.usedByProduct) ?? periods.find((a) => a.code === 'kampweek') ?? periods[0] ?? null;
  const newOptionText = lineName ? optionTextFromLineName(lineName, year) : '';
  const dates = lineName ? datesFromLineName(lineName, year) : null;
  const optionId =
    period && newOptionText
      ? suggestVariant(
          newOptionText,
          period.options.map((o) => ({ variantId: o.optionId, title: o.text, options: '' })),
          year
        )
      : null;

  return {
    product: { productId: product.product_id, name: product.name ?? `#${product.product_id}`, sku: product.sku },
    attributes: formAttributes,
    defaults: {
      price: latest?.price === null || latest?.price === undefined ? null : Number(latest.price),
      totalSeats: latest?.total_seats ? Number(latest.total_seats) : 0
    },
    suggestion: {
      attributeId: period?.attributeId ?? null,
      optionId,
      newOptionText,
      startDate: dates?.startDate ?? null,
      endDate: dates?.endDate ?? null
    }
  };
}

export interface CreateVariantInput {
  productId: number;
  // map this line name to the new variant right away
  lineName?: string | null;
  sku: string;
  title?: string | null;
  price: number | string;
  totalSeats?: number | string;
  // bookable in the shop (status); old seasons usually not
  bookable?: boolean;
  options: {
    attributeId: number;
    optionId?: number | null;
    newOption?: { text: string; startDate?: string; endDate?: string; dayCount?: string | number | null } | null;
  }[];
}

export async function createVariantForLine(input: CreateVariantInput): Promise<{
  variantId: number;
  createdOptionIds: number[];
  mapping: { orderItems: number; registrations: number } | null;
}> {
  const productId = Number(input.productId);
  const product = await select('product_id', 'uuid').from('product').where('product_id', '=', productId).load(pool);
  if (!product) {
    throw new Error('Product not found');
  }
  if (!Array.isArray(input.options) || input.options.length === 0) {
    throw new Error('Choose at least one option (e.g. the camp week)');
  }

  // New options first; removed again when the variant can't be created.
  const createdOptionIds: number[] = [];
  const pairs: { attribute_id: number; option_id: number }[] = [];
  let variantId: number;
  try {
    for (const choice of input.options) {
      const attribute = await select('attribute_id', 'attribute_code', 'type')
        .from('attribute')
        .where('attribute_id', '=', Number(choice.attributeId))
        .load(pool);
      if (!attribute) {
        throw new Error('Attribute not found');
      }
      if (choice.newOption) {
        const text = String(choice.newOption.text ?? '').trim();
        if (!text) {
          throw new Error('The new option needs a name');
        }
        const existing = await select('attribute_option_id')
          .from('attribute_option')
          .where('attribute_id', '=', attribute.attribute_id)
          .and('option_text', '=', text)
          .load(pool);
        if (existing) {
          throw new Error(`Option "${text}" already exists: pick it from the list`);
        }
        let period = { start_date: null, end_date: null, day_count: null } as Record<string, unknown>;
        if (attribute.type === 'period') {
          period = normalizeOptionPeriod(
            {
              start_date: choice.newOption.startDate,
              end_date: choice.newOption.endDate,
              day_count: choice.newOption.dayCount
            },
            text
          );
          if (!period.start_date) {
            throw new Error(`Option "${text}": fill in the start and end date`);
          }
        }
        const created = await insert('attribute_option')
          .given({
            attribute_id: attribute.attribute_id,
            attribute_code: attribute.attribute_code,
            option_text: text,
            ...period
          })
          .execute(pool);
        createdOptionIds.push(created.insertId);
        pairs.push({ attribute_id: attribute.attribute_id, option_id: created.insertId });
      } else {
        if (!choice.optionId) {
          throw new Error('Choose an option for every attribute');
        }
        pairs.push({ attribute_id: attribute.attribute_id, option_id: Number(choice.optionId) });
      }
    }

    const variant = await createProductVariant(product.uuid, {
      sku: input.sku,
      title: input.title ?? null,
      price: input.price,
      total_seats: input.totalSeats ?? 0,
      status: input.bookable ?? false,
      options: pairs
    });
    variantId = variant.product_variant_id as number;
  } catch (e) {
    if (createdOptionIds.length > 0) {
      await del('attribute_option').where('attribute_option_id', 'in', createdOptionIds).execute(pool);
    }
    throw e;
  }

  // The variant exists from here on; a failing mapping is reported as such.
  let mapping: Awaited<ReturnType<typeof saveLineMapping>> | null = null;
  if (input.lineName) {
    try {
      mapping = await saveLineMapping({ productName: input.lineName, productId, variantId });
    } catch (e) {
      throw new Error(`The variant was created, but mapping the order lines failed: ${(e as Error).message}`);
    }
  }
  return {
    variantId,
    createdOptionIds,
    mapping: mapping ? { orderItems: mapping.orderItems, registrations: mapping.registrations } : null
  };
}
