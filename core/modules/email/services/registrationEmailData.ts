import { pool } from '../../../lib/postgres/connection.js';
import { getShopLanguage } from './emailSettings.js';
import { formatDate, safeAbsoluteUrl } from './orderEmailData.js';

export type RegistrationEmailData = {
  registrationId: number;
  customerEmail: string | null;
  data: Record<string, any>;
};

/**
 * Loads a registration with its participant, the parent (participant's
 * customer), product, variant and care period (from the dated attribute
 * options of the variant, or else of the product).
 */
export async function loadRegistrationEmailData(
  registrationId: number,
  language = getShopLanguage()
): Promise<RegistrationEmailData | null> {
  const { rows } = await pool.query(
    `SELECT r.registration_id,
            p.first_name, p.last_name,
            c.email AS customer_email, c.full_name AS customer_name,
            pd.name AS product_name,
            v.title AS variant_title,
            r.product_variant_id, r.registration_product_id
     FROM "registration" r
     JOIN "participant" p ON p.participant_id = r.registration_participant_id
     LEFT JOIN "customer" c ON c.customer_id = p.customer_id
     LEFT JOIN "product_description" pd ON pd.product_description_product_id = r.registration_product_id
     LEFT JOIN "product_variant" v ON v.product_variant_id = r.product_variant_id
     WHERE r.registration_id = $1
     LIMIT 1`,
    [registrationId]
  );
  const row = rows[0];
  if (!row) {
    return null;
  }

  // Care period: dated options of the variant first, then of the product.
  let start: Date | null = null;
  let end: Date | null = null;
  if (row.product_variant_id) {
    const res = await pool.query(
      `SELECT MIN(ao.start_date) AS start_date, MAX(ao.end_date) AS end_date
       FROM "variant_attribute_value" vav
       JOIN "attribute_option" ao ON ao.attribute_option_id = vav.option_id
       WHERE vav.variant_id = $1 AND ao.start_date IS NOT NULL`,
      [row.product_variant_id]
    );
    start = res.rows[0]?.start_date ?? null;
    end = res.rows[0]?.end_date ?? null;
  }
  if (!start) {
    const res = await pool.query(
      `SELECT MIN(ao.start_date) AS start_date, MAX(ao.end_date) AS end_date
       FROM "product_attribute_value_index" pavi
       JOIN "attribute_option" ao ON ao.attribute_option_id = pavi.option_id
       WHERE pavi.product_id = $1 AND ao.start_date IS NOT NULL`,
      [row.registration_product_id]
    ).catch(() => ({ rows: [] as any[] }));
    start = res.rows[0]?.start_date ?? null;
    end = res.rows[0]?.end_date ?? null;
  }
  let period = '';
  if (start) {
    const from = formatDate(start, language);
    const to = end ? formatDate(end, language) : '';
    period = to && to !== from ? `${from} – ${to}` : from;
  }

  return {
    registrationId: row.registration_id,
    customerEmail: row.customer_email || null,
    data: {
      customer: { name: row.customer_name || '' },
      participant: { name: `${row.first_name || ''} ${row.last_name || ''}`.trim() },
      product: { name: row.product_name || '' },
      variant: { title: row.variant_title || '' },
      period,
      accountUrl: safeAbsoluteUrl('account')
    }
  };
}
