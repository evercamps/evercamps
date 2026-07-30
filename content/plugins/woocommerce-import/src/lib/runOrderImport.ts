import {
  commit,
  execute,
  getConnection,
  insert,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { debug, pool, resolveOrderStatus } from '../core.js';
import {
  findMapByExternalId,
  findOrderMapByExternalId,
  finishBatch,
  recordOrderCreated,
  recordOrderFailed,
  recordOrderUpdated,
  startBatch
} from '../services/importBatch.js';
import { getWooCommerceSettings } from '../services/settings.js';
import type {
  ImportBatchSummary,
  OrderAddressImportData,
  OrderImportData,
  OrderItemImportData,
  WooCommerceOrder
} from '../types.js';
import { mapOrder } from './mapOrder.js';
import { createWooCommerceClient, fetchAllOrders } from './woocommerceClient.js';

async function resolveLocalProductId(externalProductId: number): Promise<number> {
  const map = await findMapByExternalId(externalProductId);
  if (!map || !map.product_id) {
    throw new Error(
      `Order references WooCommerce product ${externalProductId} that has not been imported yet.`
    );
  }
  return map.product_id;
}

async function findLocalCustomerId(email: string | null): Promise<number | null> {
  if (!email) {
    return null;
  }
  const customer = await select('customer_id')
    .from('customer')
    .where('email', '=', email)
    .load(pool);
  return customer ? customer.customer_id : null;
}

async function insertAddress(
  address: OrderAddressImportData | null,
  connection: PoolClient
): Promise<number | null> {
  if (!address) {
    return null;
  }
  const result = await insert('order_address').given(address).execute(connection);
  return result.insertId;
}

// The reduce_product_stock_when_order_placed() trigger (see checkout module
// migrations) decrements product_inventory.qty on every order_item insert.
// Product import already synced current stock levels from WooCommerce (which
// already reflect these historical orders having been placed there), so
// letting the trigger fire again here would double-count the deduction -
// this immediately adds the same qty back for managed-stock products,
// mirroring the trigger's own WHERE clause so it stays a no-op for
// non-managed products.
async function compensateStockTrigger(
  productId: number,
  qty: number,
  connection: PoolClient
): Promise<void> {
  await execute(
    connection,
    `UPDATE product_inventory SET qty = qty + ${qty} WHERE product_inventory_product_id = ${productId} AND manage_stock = TRUE`
  );
}

async function createOrder(
  mapped: OrderImportData,
  resolvedItems: { item: OrderItemImportData; productId: number }[],
  customerId: number | null,
  connection: PoolClient
): Promise<{ orderId: number; cartId: number; billingAddressId: number | null; shippingAddressId: number | null }> {
  const cart = await insert('cart')
    .given({
      currency: mapped.currency,
      customer_id: customerId,
      customer_email: mapped.customer_email,
      customer_full_name: mapped.customer_full_name,
      status: false,
      sub_total: mapped.sub_total,
      sub_total_incl_tax: mapped.sub_total_incl_tax,
      sub_total_with_discount: mapped.sub_total_with_discount,
      sub_total_with_discount_incl_tax: mapped.sub_total_with_discount_incl_tax,
      total_qty: mapped.total_qty,
      tax_amount: mapped.tax_amount,
      tax_amount_before_discount: mapped.tax_amount_before_discount,
      shipping_tax_amount: mapped.shipping_tax_amount,
      shipping_fee_excl_tax: mapped.shipping_fee_excl_tax,
      shipping_fee_incl_tax: mapped.shipping_fee_incl_tax,
      discount_amount: mapped.discount_amount,
      grand_total: mapped.grand_total
    })
    .execute(connection);

  const billingAddressId = await insertAddress(mapped.billingAddress, connection);
  const shippingAddressId = await insertAddress(mapped.shippingAddress, connection);

  const status = resolveOrderStatus(mapped.paymentStatus, mapped.shipmentStatus);

  const order = await insert('order')
    .given({
      order_number: mapped.order_number,
      status,
      cart_id: cart.insertId,
      currency: mapped.currency,
      customer_id: customerId,
      customer_email: mapped.customer_email,
      customer_full_name: mapped.customer_full_name,
      shipping_fee_excl_tax: mapped.shipping_fee_excl_tax,
      shipping_fee_incl_tax: mapped.shipping_fee_incl_tax,
      discount_amount: mapped.discount_amount,
      sub_total: mapped.sub_total,
      sub_total_incl_tax: mapped.sub_total_incl_tax,
      sub_total_with_discount: mapped.sub_total_with_discount,
      sub_total_with_discount_incl_tax: mapped.sub_total_with_discount_incl_tax,
      total_qty: mapped.total_qty,
      tax_amount: mapped.tax_amount,
      tax_amount_before_discount: mapped.tax_amount_before_discount,
      shipping_tax_amount: mapped.shipping_tax_amount,
      total_tax_amount: mapped.total_tax_amount,
      grand_total: mapped.grand_total,
      payment_method: mapped.payment_method,
      payment_method_name: mapped.payment_method_name,
      shipping_address_id: shippingAddressId,
      billing_address_id: billingAddressId,
      payment_status: mapped.paymentStatus,
      shipment_status: mapped.shipmentStatus,
      created_at: mapped.createdAt,
      updated_at: mapped.createdAt
    })
    .execute(connection);

  for (const { item, productId } of resolvedItems) {
    await insert('order_item')
      .given({
        order_item_order_id: order.insertId,
        product_id: productId,
        product_sku: item.product_sku,
        product_name: item.product_name,
        product_price: item.product_price,
        product_price_incl_tax: item.product_price_incl_tax,
        qty: item.qty,
        final_price: item.final_price,
        final_price_incl_tax: item.final_price_incl_tax,
        tax_percent: item.tax_percent,
        tax_amount: item.tax_amount,
        tax_amount_before_discount: item.tax_amount_before_discount,
        discount_amount: item.discount_amount,
        line_total: item.line_total,
        line_total_incl_tax: item.line_total_incl_tax,
        line_total_with_discount: item.line_total_with_discount,
        line_total_with_discount_incl_tax: item.line_total_with_discount_incl_tax
      })
      .execute(connection);

    await compensateStockTrigger(productId, item.qty, connection);
  }

  await insert('order_activity')
    .given({
      order_activity_order_id: order.insertId,
      comment: 'Order imported from WooCommerce.',
      customer_notified: false
    })
    .execute(connection);

  return {
    orderId: order.insertId,
    cartId: cart.insertId,
    billingAddressId,
    shippingAddressId
  };
}

export async function runOrderImport(): Promise<ImportBatchSummary> {
  const settings = await getWooCommerceSettings();
  if (!settings.storeUrl || !settings.consumerKey || !settings.consumerSecret) {
    throw new Error(
      'WooCommerce store URL, consumer key and consumer secret must be configured before importing.'
    );
  }

  const client = createWooCommerceClient(settings);
  const batchId = await startBatch('orders');

  let totalFetched = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalFailed = 0;

  try {
    for await (const page of fetchAllOrders(client)) {
      for (const wcOrder of page as WooCommerceOrder[]) {
        totalFetched += 1;

        const existing = await findOrderMapByExternalId(wcOrder.id);

        if (existing && existing.order_id) {
          try {
            const mapped = mapOrder(wcOrder);
            const status = resolveOrderStatus(mapped.paymentStatus, mapped.shipmentStatus);
            await update('order')
              .given({
                status,
                payment_status: mapped.paymentStatus,
                shipment_status: mapped.shipmentStatus,
                updated_at: new Date()
              })
              .where('order_id', '=', existing.order_id)
              .execute(pool);
            await recordOrderUpdated(existing.woocommerce_order_map_id, batchId, wcOrder.date_modified);
            totalUpdated += 1;
          } catch (e) {
            debug('failed updating imported order ' + (e as Error).message);
            totalFailed += 1;
            await recordOrderFailed(
              batchId,
              wcOrder.id,
              (e as Error).message,
              existing.woocommerce_order_map_id
            );
          }
          continue;
        }

        const connection = await getConnection(pool);
        try {
          const mapped = mapOrder(wcOrder);

          const resolvedItems: { item: OrderItemImportData; productId: number }[] = [];
          for (const item of mapped.items) {
            const productId = await resolveLocalProductId(item.externalProductId);
            resolvedItems.push({ item, productId });
          }

          const customerId = await findLocalCustomerId(mapped.customer_email);

          await startTransaction(connection);
          const created = await createOrder(mapped, resolvedItems, customerId, connection);
          await commit(connection);

          await recordOrderCreated(
            batchId,
            wcOrder.id,
            created.orderId,
            created.cartId,
            created.billingAddressId,
            created.shippingAddressId,
            wcOrder.date_modified,
            existing ? existing.woocommerce_order_map_id : undefined
          );
          totalCreated += 1;
        } catch (e) {
          await rollback(connection);
          debug('failed importing order ' + (e as Error).message + ' ' + JSON.stringify(wcOrder.id));
          totalFailed += 1;
          await recordOrderFailed(
            batchId,
            wcOrder.id,
            (e as Error).message,
            existing ? existing.woocommerce_order_map_id : undefined
          );
        }
      }
    }

    const status =
      totalFailed === 0 ? 'completed' : totalCreated + totalUpdated > 0 ? 'partial' : 'failed';
    return await finishBatch(batchId, status, {
      totalFetched,
      totalCreated,
      totalUpdated,
      totalFailed
    });
  } catch (e) {
    await finishBatch(batchId, 'failed', {
      totalFetched,
      totalCreated,
      totalUpdated,
      totalFailed,
      errorMessage: (e as Error).message
    });
    throw e;
  }
}
