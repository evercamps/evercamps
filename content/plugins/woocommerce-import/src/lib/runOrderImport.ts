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
import { debug, pool, resolveOrderStatus, createCustomer, createParticipant, createRegistration} from '../core.js';
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
  WooCommerceOrder,
  WooCommerceOrderLineItem
} from '../types.js';
import { mapOrder } from './mapOrder.js';
import { createWooCommerceClient, fetchAllOrders } from './woocommerceClient.js';
import crypto from 'node:crypto';

interface ImportedParticipant {
  firstName: string;
  lastName: string;
  birthDate: string | null;
  nationalNumber: string | null;
}

async function resolveLocalProductId(
  externalProductId: number,
  productName?: string
): Promise<number> {  
  if (externalProductId) {
    const map = await findMapByExternalId(externalProductId);

    if (map?.product_id) {
      return map.product_id;
    }
  }

  // Legacy orders: WooCommerce gives product_id = 0,
  // so fall back to the product name.
  if (productName) {
    const product = await select('product_description_product_id')
      .from('product_description')
      .where('name', '=', productName)
      .load(pool);

    if (product) {
      return product.product_description_product_id;
    }
  }

  debug(
    `Could not resolve WooCommerce product. ` +
    `External ID: ${externalProductId}, name: ${productName}`
  );

  return 0;
}

async function findOrCreateCustomer(
  email: string | null,
  firstName: string | null,
  lastName: string | null
): Promise<number | null> {
  if (!email) {
    return null;
  }

  const existingCustomer = await select('customer_id')
    .from('customer')
    .where('email', '=', email)
    .load(pool);

  if (existingCustomer) {
    return existingCustomer.customer_id;
  }

  const fullName = [firstName, lastName]
    .filter((name) => name && name.trim())
    .join(' ')
    .trim();

  if (!fullName) {
    return null;
  }

  const customer = await createCustomer({
    email,
    password: crypto.randomUUID(),
    full_name: fullName
  });

  return customer.customer_id;
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
  productId: number | null,
  qty: number,
  connection: PoolClient
): Promise<void> {
  if(!productId) {
    return; 
  }
  await execute(
    connection,
    `UPDATE product_inventory SET qty = qty + ${qty} WHERE product_inventory_product_id = ${productId} AND manage_stock = TRUE`
  );
}

// "order" carries a NOT NULL cart_id with no FK to "cart" and nothing in the
// app reads it back, so imported orders point at this placeholder instead of
// creating a real (and otherwise unused) cart/cart_item row per order.
const PLACEHOLDER_CART_ID = 0;

async function createOrder(
  mapped: OrderImportData,
  resolvedItems: { item: OrderItemImportData; productId: number | null }[],
  customerId: number | null,
  connection: PoolClient
): Promise<{ orderId: number; billingAddressId: number | null; shippingAddressId: number | null }> {
  const billingAddressId = await insertAddress(mapped.billingAddress, connection);
  const shippingAddressId = await insertAddress(mapped.shippingAddress, connection);

  const status = resolveOrderStatus(mapped.paymentStatus, mapped.shipmentStatus);

  const order = await insert('order')
    .given({
      order_number: mapped.order_number,
      status,
      cart_id: PLACEHOLDER_CART_ID,
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

        //debug(JSON.stringify(wcOrder, null, 2));

        const existing = await findOrderMapByExternalId(wcOrder.id);

        if (existing && existing.order_id) {
          const connection = await getConnection(pool);

          try {
            const mapped = mapOrder(wcOrder);

            const customerId = await findOrCreateCustomer(
              mapped.customer_email,
              mapped.customer_first_name,
              mapped.customer_last_name
            );

            await startTransaction(connection);

            // Participants + registrations
            await importParticipantsForOrder(
              wcOrder,
              mapped,
              customerId
            );

            const status = resolveOrderStatus(
              mapped.paymentStatus,
              mapped.shipmentStatus
            );

            await update('order')
              .given({
                status,
                payment_status: mapped.paymentStatus,
                shipment_status: mapped.shipmentStatus,
                customer_id: customerId,
                customer_email: mapped.customer_email,
                customer_full_name: mapped.customer_full_name,
                updated_at: new Date()
              })
              .where('order_id', '=', existing.order_id)
              .execute(connection);

            await commit(connection);

            await recordOrderUpdated(
              existing.woocommerce_order_map_id,
              batchId,
              wcOrder.date_modified
            );

            totalUpdated += 1;
          } catch (e) {
            await rollback(connection);

            debug(
              'failed updating imported order ' +
              (e as Error).message
            );

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
            const productId = await resolveLocalProductId(item.externalProductId, item.product_name);
            resolvedItems.push({ item, productId });
          }

          const customerId = await findOrCreateCustomer(mapped.customer_email, 
            mapped.customer_first_name, mapped.customer_last_name);

          await startTransaction(connection);

          await importParticipantsForOrder(wcOrder, mapped, customerId);

          const created = await createOrder(mapped, resolvedItems, customerId, connection);
          await commit(connection);

          await recordOrderCreated(
            batchId,
            wcOrder.id,
            created.orderId,
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

function extractParticipants(
  lineItem: WooCommerceOrderLineItem
): ImportedParticipant[] {
  return lineItem.meta_data
    .filter((meta) => meta.display_key?.startsWith('Ticket #'))
    .map((meta) => {
      const value = meta.display_value;

      const firstNameMatch = value.match(
        /Voornaam:\s*(.*?)\s+Naam:/
      );

      const lastNameMatch = value.match(
        /Naam:\s*(.*?)\s+Geboortedatum:/
      );

      const birthDateMatch = value.match(
        /Geboortedatum:\s*(.*?)(?=\s+Rijksregisternummer kind)/
      );

      const nationalNumberMatch = value.match(
        /Rijksregisternummer kind \(fiscaal attest\):\s*(.*?)(?=\s+Rijksregisternummer ouder)/
      );

      if (!firstNameMatch || !lastNameMatch) {
        throw new Error(
          `Could not parse participant from WooCommerce metadata: ${value}`
        );
      }

      const rawBirthDate = birthDateMatch?.[1]?.trim();
      const rawNationalNumber = nationalNumberMatch?.[1]?.trim();

      const birthDate =
        rawBirthDate && rawBirthDate !== '/'
          ? normalizeBirthDate(rawBirthDate)
          : null;

      const nationalNumber =
        rawNationalNumber && rawNationalNumber !== '/'
          ? rawNationalNumber.replace(/\D/g, '')
          : null;

      return {
        firstName: firstNameMatch[1].trim(),
        lastName: lastNameMatch[1].trim(),
        birthDate,
        nationalNumber
      };
    });
}

async function findOrCreateParticipant(
  participant: ImportedParticipant,
  customerId: number | null
): Promise<number> {
  // First try to find the participant by national number.
  // The national number is the strongest identifier we have.
  if (participant.nationalNumber) {
    const existingByNationalNumber = await select('participant_id')
      .from('participant')
      .where('national_number', '=', participant.nationalNumber)
      .load(pool);

    if (existingByNationalNumber) {
      return existingByNationalNumber.participant_id;
    }
  }

  // Fall back to name + birth date.
  let query = select('participant_id')
    .from('participant')
    .where('first_name', '=', participant.firstName)
    .and('last_name', '=', participant.lastName);

  if (participant.birthDate) {
    query = query.and('birth_date', '=', participant.birthDate);
  }

  const existingParticipant = await query.load(pool);

  if (existingParticipant) {
    return existingParticipant.participant_id;
  }

  const data: any = {
    first_name: participant.firstName,
    last_name: participant.lastName,
    customer_id: customerId
  };

  if (participant.birthDate) {
    data.birth_date = participant.birthDate;
  }

  if (participant.nationalNumber) {
    data.national_number = participant.nationalNumber;
  } else {
    data.national_number_not_applicable = true;
  }

  try {
    const created = await createParticipant(data);

    return created.insertId;
  } catch (error) {
    const message = (error as Error).message;

    if (
      participant.nationalNumber &&
      message.includes('National number is invalid')
    ) {
      debug(
        `Invalid national number for participant ` +
        `${participant.firstName} ${participant.lastName}: ` +
        `${participant.nationalNumber}. Creating without national number.`
      );

      const created = await createParticipant({
        first_name: participant.firstName,
        last_name: participant.lastName,
        ...(participant.birthDate
          ? { birth_date: participant.birthDate }
          : {}),
        national_number_not_applicable: true,
        customer_id: customerId
      });

      return created.insertId;
    }

    throw error;
  }
}

async function createRegistrationIfNeeded(
  participantId: number,
  productId: number
): Promise<void> {
  const existingRegistration = await select('registration_id')
    .from('registration')
    .where('registration_participant_id', '=', participantId)
    .and('registration_product_id', '=', productId)
    .load(pool);

  if (existingRegistration) {
    return;
  }

  await createRegistration({
    registration_participant_id: participantId,
    registration_product_id: productId
  });
}

async function importParticipantsForOrder(
  wcOrder: WooCommerceOrder,
  mapped: OrderImportData,
  customerId: number | null
): Promise<void> {
  for (const item of mapped.items) {
    const productId = await resolveLocalProductId(
      item.externalProductId, item.product_name
    );

    if (!productId) {
      debug(
        `Skipping participants for line item ${item.externalLineItemId}: ` +
        `no local product found for WooCommerce product ${item.externalProductId}`
      );

      continue;
    }

    const wcLineItem = wcOrder.line_items.find(
      (lineItem) => lineItem.id === item.externalLineItemId
    );

    if (!wcLineItem) {
      throw new Error(
        `WooCommerce line item ${item.externalLineItemId} could not be found.`
      );
    }

    const participants = extractParticipants(wcLineItem);

    for (const participant of participants) {
      const participantId = await findOrCreateParticipant(
        participant,
        customerId
      );

      await createRegistrationIfNeeded(
        participantId,
        productId
      );
    }
  }
}

function normalizeBirthDate(value: string): string | null {
  const match = value.match(
    /^(\d{2})[\/\-\s](\d{2})[\/\-\s](\d{4})$/
  );

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;

  return `${year}-${month}-${day}`;
}