import { pool } from '../../core.js';
import { fallbackYear, resolveCarePeriod, toDateString, type PeriodOption } from '../../lib/carePeriod.js';
import type { CandidateRegistration, EditablePeriodOption, PayerShare } from './buildAttests.js';

// Read-only: everything buildAttests needs for one income year
// (core/.docs/fiscal-attests.md, Phase 3). Registrations of products that
// manage registrations and are marked fiscal_attest_eligible, whose care
// period starts in `year`. Registrations without a usable period are included
// (in the year of their variant title / creation) so they show up as issues.

export interface CollectedYear {
  year: number;
  candidates: CandidateRegistration[];
  // dated registrations in the year on registration products NOT marked eligible
  notEligible: { registrationId: number; participantName: string; productId: number; productName: string }[];
}

async function query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await (pool as any).query(sql, params);
  return result.rows as T[];
}

function addressOf(row: any, prefix: string) {
  return {
    street: [row[`${prefix}address_1`], row[`${prefix}address_2`]].filter(Boolean).join(' '),
    postcode: row[`${prefix}postcode`] ?? '',
    city: row[`${prefix}city`] ?? '',
    country: row[`${prefix}country`] ?? 'BE'
  };
}

export async function collectAttestCandidates(year: number): Promise<CollectedYear> {
  // 1. Registrations on registration products (eligible or not).
  const registrations = await query(
    `SELECT r.registration_id, r.created_at, r.registration_product_id, r.product_variant_id,
            p.participant_id, p.first_name, p.last_name, p.birth_date, p.customer_id AS participant_customer_id,
            p.national_number, p.national_number_not_applicable,
            pr.fiscal_attest_eligible, pd.name AS product_name, pv.title AS variant_title, pv.price AS variant_price
     FROM registration r
     JOIN participant p ON p.participant_id = r.registration_participant_id
     JOIN product pr ON pr.product_id = r.registration_product_id AND pr.manage_registrations
     LEFT JOIN product_description pd ON pd.product_description_product_id = pr.product_id
     LEFT JOIN product_variant pv ON pv.product_variant_id = r.product_variant_id`
  );
  if (registrations.length === 0) {
    return { year, candidates: [], notEligible: [] };
  }
  const ids = registrations.map((r) => r.registration_id);

  // 2. Dated period options: of the variant (rank 1) and of the product (rank 2).
  const options = await query(
    `SELECT r.registration_id, 1 AS source_rank, ao.option_text, ao.start_date, ao.end_date, ao.day_count
     FROM registration r
     JOIN variant_attribute_value vav ON vav.variant_id = r.product_variant_id
     JOIN attribute_option ao ON ao.attribute_option_id = vav.option_id
     WHERE r.registration_id = ANY($1) AND (ao.start_date IS NOT NULL OR ao.end_date IS NOT NULL)
     UNION ALL
     SELECT r.registration_id, 2, ao.option_text, ao.start_date, ao.end_date, ao.day_count
     FROM registration r
     JOIN product_attribute_value_index pav ON pav.product_id = r.registration_product_id
     JOIN attribute_option ao ON ao.attribute_option_id = pav.option_id
     WHERE r.registration_id = ANY($1) AND (ao.start_date IS NOT NULL OR ao.end_date IS NOT NULL)`,
    [ids]
  );
  const optionsByRegistration = new Map<number, PeriodOption[]>();
  for (const o of options) {
    const list = optionsByRegistration.get(o.registration_id) ?? [];
    list.push({
      sourceRank: Number(o.source_rank) as 1 | 2,
      optionText: o.option_text,
      startDate: toDateString(o.start_date),
      endDate: toDateString(o.end_date),
      dayCount: o.day_count === null ? null : Number(o.day_count)
    });
    optionsByRegistration.set(o.registration_id, list);
  }

  // Keep the registrations of this year.
  const inYear = registrations.filter((r) => {
    const resolved = resolveCarePeriod(optionsByRegistration.get(r.registration_id) ?? []);
    const regYear = resolved.ok
      ? parseInt(resolved.period.startDate.slice(0, 4), 10)
      : fallbackYear(r.variant_title, r.created_at);
    return regYear === year;
  });
  const notEligible = inYear
    .filter((r) => !r.fiscal_attest_eligible && optionsByRegistration.has(r.registration_id))
    .map((r) => ({
      registrationId: r.registration_id,
      participantName: `${r.first_name} ${r.last_name}`,
      productId: r.registration_product_id,
      productName: r.product_name ?? ''
    }));
  const eligible = inYear.filter((r) => r.fiscal_attest_eligible);
  if (eligible.length === 0) {
    return { year, candidates: [], notEligible };
  }
  const eligibleIds = eligible.map((r) => r.registration_id);

  // 3. Order line, order and payer (order customer + billing address).
  const orders = await query(
    `SELECT oir.registration_id, oir.payer_national_number, oir.customer_id AS oir_customer_id,
            oi.order_item_id, oi.line_total_with_discount_incl_tax,
            (SELECT COUNT(*) FROM order_item_registration x WHERE x.order_item_id = oi.order_item_id) AS registrations_on_line,
            o.order_id, o.order_number, o.payment_status, o.customer_id AS order_customer_id, o.customer_full_name,
            c.full_name AS customer_full_name_now, c.national_number AS customer_national_number,
            ba.full_name AS bill_full_name, ba.address_1 AS bill_address_1, ba.address_2 AS bill_address_2,
            ba.postcode AS bill_postcode, ba.city AS bill_city, ba.country AS bill_country
     FROM order_item_registration oir
     JOIN order_item oi ON oi.order_item_id = oir.order_item_id
     JOIN "order" o ON o.order_id = oi.order_item_order_id
     LEFT JOIN customer c ON c.customer_id = COALESCE(oir.customer_id, o.customer_id)
     LEFT JOIN order_address ba ON ba.order_address_id = o.billing_address_id
     WHERE oir.registration_id = ANY($1)`,
    [eligibleIds]
  );
  const orderByRegistration = new Map(orders.map((o) => [o.registration_id, o]));

  // Fallback payer for registrations without an order (override only): the
  // participant's customer and their default address.
  const fallbackCustomers = await query(
    `SELECT c.customer_id, c.full_name, c.national_number,
            a.address_1 AS addr_address_1, a.address_2 AS addr_address_2, a.postcode AS addr_postcode,
            a.city AS addr_city, a.country AS addr_country
     FROM customer c
     LEFT JOIN LATERAL (
       SELECT * FROM customer_address ca WHERE ca.customer_id = c.customer_id
       ORDER BY ca.is_default DESC NULLS LAST LIMIT 1
     ) a ON true
     WHERE c.customer_id = ANY($1)`,
    [[...new Set(eligible.map((r) => r.participant_customer_id).filter(Boolean))]]
  );
  const customerById = new Map(fallbackCustomers.map((c) => [c.customer_id, c]));

  // 3b. The variant's attribute options (dated or not), so the admin page can
  // set the camp week's dates in place. Falls back to the dated product options.
  const variantOptions = await query(
    `SELECT r.registration_id, ao.attribute_option_id, ao.option_text, a.attribute_name,
            ao.start_date, ao.end_date, ao.day_count
     FROM registration r
     JOIN variant_attribute_value vav ON vav.variant_id = r.product_variant_id
     JOIN attribute_option ao ON ao.attribute_option_id = vav.option_id
     JOIN attribute a ON a.attribute_id = vav.attribute_id
     WHERE r.registration_id = ANY($1)
     UNION ALL
     SELECT r.registration_id, ao.attribute_option_id, ao.option_text, a.attribute_name,
            ao.start_date, ao.end_date, ao.day_count
     FROM registration r
     JOIN product_attribute_value_index pav ON pav.product_id = r.registration_product_id
     JOIN attribute_option ao ON ao.attribute_option_id = pav.option_id
     JOIN attribute a ON a.attribute_id = pav.attribute_id
     WHERE r.registration_id = ANY($1)
       AND r.product_variant_id IS NULL
       AND (ao.start_date IS NOT NULL OR ao.end_date IS NOT NULL)`,
    [eligibleIds]
  );
  const editableByRegistration = new Map<number, EditablePeriodOption[]>();
  for (const o of variantOptions) {
    const list = editableByRegistration.get(o.registration_id) ?? [];
    if (!list.some((x) => x.optionId === o.attribute_option_id)) {
      list.push({
        optionId: o.attribute_option_id,
        attributeName: o.attribute_name,
        optionText: o.option_text,
        startDate: toDateString(o.start_date),
        endDate: toDateString(o.end_date),
        dayCount: o.day_count === null ? null : Number(o.day_count)
      });
    }
    editableByRegistration.set(o.registration_id, list);
  }

  // 4. Manual amounts and active payer splits.
  const overrides = await query(
    `SELECT registration_id, amount, note FROM fiscal_attest_amount_override WHERE registration_id = ANY($1)`,
    [eligibleIds]
  );
  const overrideByRegistration = new Map(overrides.map((o) => [o.registration_id, o]));
  const payerRows = await query(
    `SELECT * FROM fiscal_attest_payer WHERE registration_id = ANY($1) AND status = 'active'
     ORDER BY fiscal_attest_payer_id`,
    [eligibleIds]
  );

  const candidates: CandidateRegistration[] = eligible.map((r) => {
    const order = orderByRegistration.get(r.registration_id);
    const override = overrideByRegistration.get(r.registration_id);
    const fallback = customerById.get(r.participant_customer_id);

    let defaultPayer: PayerShare | null = null;
    if (order) {
      defaultPayer = {
        customerId: order.oir_customer_id ?? order.order_customer_id ?? null,
        fullName: order.bill_full_name || order.customer_full_name || order.customer_full_name_now || '',
        nationalNumber: order.payer_national_number || order.customer_national_number || null,
        address: addressOf(order, 'bill_'),
        sharePercent: 100
      };
    } else if (fallback) {
      defaultPayer = {
        customerId: fallback.customer_id,
        fullName: fallback.full_name ?? '',
        nationalNumber: fallback.national_number ?? null,
        address: addressOf(fallback, 'addr_'),
        sharePercent: 100
      };
    }

    const lineTotal = order ? Number(order.line_total_with_discount_incl_tax) : null;
    const perRegistration =
      order && lineTotal !== null ? lineTotal / Math.max(Number(order.registrations_on_line), 1) : null;

    return {
      registrationId: r.registration_id,
      participantId: r.participant_id,
      firstName: r.first_name,
      lastName: r.last_name,
      birthDate: toDateString(r.birth_date),
      nationalNumber: r.national_number ?? null,
      nationalNumberNotApplicable: !!r.national_number_not_applicable,
      productId: r.registration_product_id,
      productName: r.product_name ?? '',
      variantTitle: r.variant_title ?? null,
      suggestedPrice: r.variant_price === null || r.variant_price === undefined ? null : Number(r.variant_price),
      periodOptions: optionsByRegistration.get(r.registration_id) ?? [],
      editableOptions: editableByRegistration.get(r.registration_id) ?? [],
      order: order
        ? {
            orderId: order.order_id,
            orderNumber: order.order_number,
            paymentStatus: order.payment_status,
            amount: perRegistration
          }
        : null,
      overrideAmount: override ? Number(override.amount) : null,
      payers: payerRows
        .filter((p) => p.registration_id === r.registration_id)
        .map((p) => ({
          customerId: p.customer_id ?? null,
          fullName: p.full_name,
          nationalNumber: p.national_number ?? null,
          address: typeof p.address === 'string' ? JSON.parse(p.address) : p.address ?? {},
          sharePercent: Number(p.share_percent)
        })),
      defaultPayer
    };
  });

  return { year, candidates, notEligible };
}
