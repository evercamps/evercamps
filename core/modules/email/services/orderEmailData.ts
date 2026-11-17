import { select } from '@evershop/postgres-query-builder';
import { warning } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { buildAbsoluteUrl } from '../../../lib/router/buildAbsoluteUrl.js';
import { getShopLanguage } from './emailSettings.js';
import { escapeHtml } from './escapeHtml.js';

export type OrderRow = {
  order_id: number;
  uuid: string;
  order_number: string;
  currency: string;
  customer_id: number | null;
  customer_email: string | null;
  customer_full_name: string | null;
  grand_total: string | number;
  payment_method_name: string | null;
  payment_status: string;
  status: string;
  created_at: Date | string;
};

type OrderItemRow = {
  order_item_id: number;
  product_name: string;
  qty: number;
  line_total_with_discount_incl_tax: string | number;
  product_variant_id: number | null;
};

export type OrderEmailData = {
  order: OrderRow;
  data: Record<string, any>;
};

const LABELS: Record<string, { product: string; participants: string; total: string; price: string }> = {
  nl: { product: 'Product', participants: 'Deelnemers', total: 'Totaal', price: 'Prijs' },
  fr: { product: 'Produit', participants: 'Participants', total: 'Total', price: 'Prix' },
  en: { product: 'Product', participants: 'Participants', total: 'Total', price: 'Price' }
};

function labels(language: string) {
  return LABELS[language.split(/[-_]/)[0]] || LABELS.en;
}

export function formatMoney(value: string | number, currency: string, language: string): string {
  const amount = typeof value === 'number' ? value : parseFloat(value || '0');
  try {
    return new Intl.NumberFormat(language, { style: 'currency', currency: currency || 'EUR' }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDate(value: Date | string | null | undefined, language: string): string {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(date);
}

/** buildAbsoluteUrl, but never throws (an email without link beats no email) */
export function safeAbsoluteUrl(routeId: string, params: Record<string, any> = {}): string {
  try {
    return buildAbsoluteUrl(routeId, params);
  } catch (e) {
    warning(`Could not build url for ${routeId}: ${(e as Error).message}`);
    return '';
  }
}

/**
 * Loads an order with its items and participant names, and prepares the
 * template data. Reloads the order by id, because event data can be stale.
 */
export async function loadOrderEmailData(orderId: number, language = getShopLanguage()): Promise<OrderEmailData | null> {
  const order = (await select().from('order').where('order_id', '=', orderId).load(pool)) as OrderRow | null;
  if (!order) {
    return null;
  }

  const itemQuery = select().from('order_item');
  itemQuery.where('order_item_order_id', '=', order.order_id);
  itemQuery.orderBy('order_item_id', 'ASC');
  const items = (await itemQuery.execute(pool)) as OrderItemRow[];

  const itemIds = items.map((i) => i.order_item_id);
  const registrations = itemIds.length
    ? await select('order_item_id', 'first_name', 'last_name')
        .from('order_item_registration')
        .where('order_item_id', 'IN', itemIds)
        .execute(pool)
    : [];

  const variantIds = items.map((i) => i.product_variant_id).filter((id): id is number => Boolean(id));
  const variants = variantIds.length
    ? await select('product_variant_id', 'title')
        .from('product_variant')
        .where('product_variant_id', 'IN', variantIds)
        .execute(pool)
    : [];

  const l = labels(language);
  const cell = 'padding:8px 4px;border-bottom:1px solid #e5e7eb;vertical-align:top;';
  const rows = items
    .map((item) => {
      const variant = variants.find((v: any) => v.product_variant_id === item.product_variant_id);
      const names = registrations
        .filter((r: any) => r.order_item_id === item.order_item_id)
        .map((r: any) => `${r.first_name} ${r.last_name}`.trim());
      const title = variant?.title ? `${item.product_name} – ${variant.title}` : item.product_name;
      const qty = item.qty > 1 ? `${item.qty} × ` : '';
      return `<tr>
<td style="${cell}">${escapeHtml(qty + title)}${
        names.length
          ? `<br><span style="color:#6b7280;font-size:13px;">${escapeHtml(l.participants)}: ${escapeHtml(names.join(', '))}</span>`
          : ''
      }</td>
<td style="${cell}text-align:right;white-space:nowrap;">${escapeHtml(
        formatMoney(item.line_total_with_discount_incl_tax, order.currency, language)
      )}</td>
</tr>`;
    })
    .join('\n');

  const total = formatMoney(order.grand_total, order.currency, language);
  const itemsTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
<tr><th align="left" style="${cell}">${escapeHtml(l.product)}</th><th align="right" style="${cell}">${escapeHtml(l.price)}</th></tr>
${rows}
<tr><td style="padding:8px 4px;font-weight:bold;">${escapeHtml(l.total)}</td><td style="padding:8px 4px;font-weight:bold;text-align:right;">${escapeHtml(total)}</td></tr>
</table>`;

  return {
    order,
    data: {
      customer: { name: order.customer_full_name || '' },
      order: {
        number: order.order_number,
        date: formatDate(order.created_at, language),
        total,
        paymentMethod: order.payment_method_name || '',
        url: safeAbsoluteUrl('account'),
        adminUrl: safeAbsoluteUrl('orderEdit', { id: order.uuid }),
        customerEmail: order.customer_email || ''
      },
      itemsTable
    }
  };
}
