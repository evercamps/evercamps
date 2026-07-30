import type {
  OrderAddressImportData,
  OrderImportData,
  OrderItemImportData,
  WooCommerceOrder,
  WooCommerceOrderAddress,
  WooCommerceOrderLineItem
} from '../types.js';
import { createProduct, debug, error, updateProduct } from '../core.js';

// WooCommerce order statuses mapped to EverShop's separate payment/shipment
// status axes (oms.order.paymentStatus / oms.order.shipmentStatus config
// keys - see core/modules/oms/bootstrap.ts) - EverShop's overall order
// `status` is then derived from this pair via resolveOrderStatus().
const STATUS_MAP: Record<string, { paymentStatus: string; shipmentStatus: string }> = {
  pending: { paymentStatus: 'pending', shipmentStatus: 'pending' },
  'on-hold': { paymentStatus: 'pending', shipmentStatus: 'pending' },
  processing: { paymentStatus: 'paid', shipmentStatus: 'processing' },
  completed: { paymentStatus: 'paid', shipmentStatus: 'delivered' },
  cancelled: { paymentStatus: 'canceled', shipmentStatus: 'canceled' },
  refunded: { paymentStatus: 'canceled', shipmentStatus: 'canceled' },
  failed: { paymentStatus: 'canceled', shipmentStatus: 'canceled' }
};

function num(value: string | number | undefined | null): number {
  const parsed = typeof value === 'number' ? value : parseFloat(value || '0');
  return Number.isNaN(parsed) ? 0 : parsed;
}

function mapAddress(address: WooCommerceOrderAddress | undefined): OrderAddressImportData | null {
  if (!address) {
    return null;
  }
  const fullName = [address.first_name, address.last_name].filter(Boolean).join(' ').trim();
  const hasContent =
    fullName || address.address_1 || address.city || address.postcode || address.country;
  if (!hasContent) {
    return null;
  }
  return {
    full_name: fullName || 'Unknown',
    postcode: address.postcode || null,
    telephone: address.phone || null,
    country: address.country || null,
    province: address.state || null,
    city: address.city || null,
    address_1: address.address_1 || null,
    address_2: address.address_2 || null
  };
}

function mapLineItem(item: WooCommerceOrderLineItem): OrderItemImportData {
  debug(JSON.stringify(item));
  if (!item.product_id) {
    throw new Error(`Order line item "${item.name}" has no WooCommerce product reference.`);
  }

  const qty = item.quantity || 0;
  if (qty <= 0) {
    throw new Error(`Order line item "${item.name}" has an invalid quantity.`);
  }

  // WooCommerce's `subtotal`/`subtotal_tax` reflect the line before any
  // per-item discount, while `total`/`total_tax` reflect it after discount.
  // EverShop's own Cart pricing (core/modules/checkout/services/cart/fields/
  // cartItem/pricing.ts + core/modules/promotion/services/
  // registerCartItemPromotionFields.js) never bakes a discount into
  // product_price/final_price themselves - those stay at the undiscounted
  // unit price, and the discount only shows up via discount_amount and the
  // derived line_total_with_discount(_incl_tax) columns. Mirror that split
  // here instead of discounting the unit price fields.
  const lineTotal = num(item.subtotal);
  const lineTotalTax = num(item.subtotal_tax);
  const lineTotalWithDiscount = num(item.total);
  const lineTotalWithDiscountTax = num(item.total_tax);
  const discountAmount = lineTotal - lineTotalWithDiscount;

  const productPrice = lineTotal / qty;
  const productPriceInclTax = productPrice + lineTotalTax / qty;

  return {
    externalProductId: item.product_id,
    product_sku: item.sku || `wc_product_${item.product_id}`,
    product_name: item.name,
    qty,
    product_price: productPrice,
    product_price_incl_tax: productPriceInclTax,
    final_price: productPrice,
    final_price_incl_tax: productPriceInclTax,
    tax_percent: lineTotal > 0 ? (lineTotalTax / lineTotal) * 100 : 0,
    tax_amount: lineTotalWithDiscountTax,
    tax_amount_before_discount: lineTotalTax,
    discount_amount: discountAmount,
    line_total: lineTotal,
    line_total_incl_tax: lineTotal + lineTotalTax,
    line_total_with_discount: lineTotalWithDiscount,
    line_total_with_discount_incl_tax: lineTotalWithDiscount + lineTotalWithDiscountTax
  };
}

export function mapOrder(wcOrder: WooCommerceOrder): OrderImportData {
  const statusMapping = STATUS_MAP[wcOrder.status];
  if (!statusMapping) {
    throw new Error(`WooCommerce order ${wcOrder.id} has unsupported status "${wcOrder.status}".`);
  }

  if (!wcOrder.line_items || wcOrder.line_items.length === 0) {
    throw new Error(`WooCommerce order ${wcOrder.id} has no line items.`);
  }

  const items = wcOrder.line_items.map(mapLineItem);

  const subTotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const subTotalWithDiscount = items.reduce((sum, item) => sum + item.line_total_with_discount, 0);
  const itemsTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
  const itemsTaxBeforeDiscount = items.reduce((sum, item) => sum + item.tax_amount_before_discount, 0);
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  const shippingFeeExclTax = num(wcOrder.shipping_total);
  const shippingTaxAmount = num(wcOrder.shipping_tax);

  const billingName = [wcOrder.billing?.first_name, wcOrder.billing?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    order_number: `WC-${wcOrder.number || wcOrder.id}`,
    currency: wcOrder.currency,
    customer_email: wcOrder.billing?.email || null,
    customer_full_name: billingName || null,
    payment_method: wcOrder.payment_method || null,
    payment_method_name: wcOrder.payment_method_title || null,
    paymentStatus: statusMapping.paymentStatus,
    shipmentStatus: statusMapping.shipmentStatus,
    createdAt: wcOrder.date_created,
    shipping_fee_excl_tax: shippingFeeExclTax,
    shipping_fee_incl_tax: shippingFeeExclTax + shippingTaxAmount,
    shipping_tax_amount: shippingTaxAmount,
    discount_amount: num(wcOrder.discount_total),
    sub_total: subTotal,
    sub_total_incl_tax: subTotal + itemsTaxBeforeDiscount,
    sub_total_with_discount: subTotalWithDiscount,
    sub_total_with_discount_incl_tax: subTotalWithDiscount + itemsTax,
    tax_amount: itemsTax,
    tax_amount_before_discount: itemsTaxBeforeDiscount,
    total_tax_amount: num(wcOrder.total_tax),
    total_qty: totalQty,
    grand_total: num(wcOrder.total),
    billingAddress: mapAddress(wcOrder.billing),
    shippingAddress: mapAddress(wcOrder.shipping),
    items
  };
}
