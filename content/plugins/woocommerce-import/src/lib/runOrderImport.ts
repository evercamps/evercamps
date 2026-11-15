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
import { debug, pool, resolveOrderStatus, createCustomer, createParticipant, createRegistration, getEnabledExtensions} from '../core.js';
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
import { ensureSeasonVariant, isUnseasonedTwin } from './importVariants.js';
import { campKey, parseCampProductName, seasonForDate } from './season.js';
import { findCampProduct } from './campProducts.js';
import { createCustomerNationalNumberImporter, isValidNationalNumber } from './customerNationalNumber.js';
import { findLineNameMap } from '../services/lineNameMap.js';

interface ImportedParticipant {
  firstName: string;
  lastName: string;
  birthDate: string | null;
  nationalNumber: string | null;
  // "Rijksregisternummer ouder" from the ticket: the payer's national number,
  // needed for the fiscal attest (core/.docs/fiscal-attests.md).
  payerNationalNumber: string | null;
}

// Local order_item id per WooCommerce line item id of one order.
type OrderItemIdsByLine = Map<number, number>;

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

  // A line name mapped by hand on the "Unmapped order lines" admin page.
  const named = await findLineNameMap(productName);
  if (named) {
    return named.product_id;
  }

  // Legacy orders: WooCommerce gives product_id = 0,
  // so fall back to the product name.
  if (productName) {
    // Camp products are merged per camp type ("X 2022" -> "X"); a variation
    // line is named "<product> - <variation>".
    const { baseName } = parseCampProductName(productName.split(' - ')[0]);
    const camp = await findCampProduct(campKey(baseName));
    if (camp) {
      return camp.product_id;
    }


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

// A WC variation resolves through woocommerce_variation_map. A simple product
// (no variation id) resolves to the product's default variant, the same one
// native checkout uses. That way registrations/order lines of simple products
// carry a variant too, and match the registrations backfilled by camp
// migration Version-1.0.4 instead of creating duplicates on re-import.
async function resolveLocalVariantId(
  externalVariationId: number | null,
  productId: number | null,
  externalProductId?: number | null
): Promise<number | null> {
  if (!externalVariationId) {
    // A simple WC product's synthetic variant is mapped under the product's
    // own id (see mapVariant.variantInputFromSimpleProduct). For a merged
    // camp product this is that year's variant, not the default.
    if (externalProductId) {
      const simpleMap = await select('product_variant_id')
        .from('woocommerce_variation_map')
        .where('external_variation_id', '=', externalProductId)
        .load(pool);
      if (simpleMap?.product_variant_id) {
        return simpleMap.product_variant_id;
      }
    }
    if (!productId) {
      return null;
    }
    const defaultVariant = await select('product_variant_id')
      .from('product_variant')
      .where('product_id', '=', productId)
      .and('is_default', '=', true)
      .load(pool);
    return defaultVariant ? defaultVariant.product_variant_id : null;
  }

  const variationMap = await select('product_variant_id')
    .from('woocommerce_variation_map')
    .where('external_variation_id', '=', externalVariationId)
    .load(pool);

  if (!variationMap?.product_variant_id) {
    debug(
      `Could not resolve WooCommerce variation. ` +
      `External variation ID: ${externalVariationId}`
    );

    return null;
  }

  return variationMap.product_variant_id;
}

async function isMappedVariation(externalVariationId: number | null): Promise<boolean> {
  if (!externalVariationId) {
    return false;
  }
  const row = await select('product_variant_id')
    .from('woocommerce_variation_map')
    .where('external_variation_id', '=', externalVariationId)
    .load(pool);
  return !!row?.product_variant_id;
}

// Season of an order line: the year of its WooCommerce product ("X 2022" ->
// 2022, stored on woocommerce_product_map.external_year by the product
// import, or read from the line's product name), else the order date
// (1 October rule, see season.ts).
async function seasonForLine(item: OrderItemImportData, orderDate: string): Promise<number> {
  if (item.externalProductId) {
    const map = await findMapByExternalId(item.externalProductId);
    if (map?.external_year) {
      return map.external_year;
    }
  }
  const { year } = parseCampProductName((item.product_name || '').split(' - ')[0]);
  return year ?? seasonForDate(orderDate);
}

// The variant an order line is booked on: the WC variation's variant, for the
// line's season (kampweek "Week 1 zomer 2022"). See season.ts.
async function resolveOrderLineVariantId(
  item: OrderItemImportData,
  productId: number | null,
  orderDate: string
): Promise<number | null> {
  // A line whose WC variation isn't known here (deleted product/variation)
  // uses the variant chosen by hand for its name, as is (no season shift).
  if (!(await isMappedVariation(item.externalVariationId))) {
    const named = await findLineNameMap(item.product_name);
    if (named && named.product_id === productId) {
      return named.product_variant_id;
    }
  }
  const baseVariantId = await resolveLocalVariantId(
    item.externalVariationId,
    productId,
    item.externalProductId
  );
  if (!baseVariantId || !productId) {
    return baseVariantId;
  }
  return ensureSeasonVariant(productId, baseVariantId, await seasonForLine(item, orderDate));
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
  resolvedItems: { item: OrderItemImportData; productId: number | null; productVariantId: number | null; }[],
  customerId: number | null,
  connection: PoolClient
): Promise<{
  orderId: number;
  billingAddressId: number | null;
  shippingAddressId: number | null;
  orderItemIds: OrderItemIdsByLine;
}> {
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

  const orderItemIds: OrderItemIdsByLine = new Map();
  for (const { item, productId, productVariantId } of resolvedItems) {
    const orderItem = await insert('order_item')
      .given({
        order_item_order_id: order.insertId,
        product_id: productId,
        product_variant_id: productVariantId,
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
    orderItemIds.set(item.externalLineItemId, orderItem.insertId);

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
    shippingAddressId,
    orderItemIds
  };
}

export async function runOrderImport(): Promise<ImportBatchSummary> {
  const settings = await getWooCommerceSettings();
  if (!settings.storeUrl || !settings.consumerKey || !settings.consumerSecret) {
    throw new Error(
      'WooCommerce store URL, consumer key and consumer secret must be configured before importing.'
    );
  }

  const extensions = await getEnabledExtensions();

  // The national-number plugin is being renamed to "belgian-administration"
  // (core/.docs/plan-variant-import.md, step 23); accept both names.
  const nationalNumberEnabled = extensions.some((extension: any) =>
    ['national-number-field', 'belgian-administration'].includes(extension.name)
  );

  const client = createWooCommerceClient(settings);
  // Customer national number from the WC customer's custom field (meta_data).
  const importCustomerNationalNumber = createCustomerNationalNumberImporter(client, settings);
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
            await importCustomerNationalNumber(wcOrder, customerId);

            await startTransaction(connection);

            const orderItemIds = await mapExistingOrderItems(
              existing.order_id,
              mapped.items,
              wcOrder.date_created,
              connection
            );

            // Participants + registrations (+ their order_item_registration
            // link). Re-running the import on already-imported orders is also
            // the backfill for links that are missing.
            await importParticipantsForOrder(
              wcOrder,
              mapped,
              customerId,
              nationalNumberEnabled,
              orderItemIds,
              connection
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

          const resolvedItems: { item: OrderItemImportData; productId: number; productVariantId: number | null; }[] = [];
          for (const item of mapped.items) {
            const productId = await resolveLocalProductId(item.externalProductId, item.product_name);
            const productVariantId = await resolveOrderLineVariantId(
              item,
              productId,
              wcOrder.date_created
            );
            resolvedItems.push({ item, productId, productVariantId });
          }

          const customerId = await findOrCreateCustomer(mapped.customer_email,
            mapped.customer_first_name, mapped.customer_last_name);
          await importCustomerNationalNumber(wcOrder, customerId);

          await startTransaction(connection);

          // Order (and its order_items) first, so each registration can be
          // linked to the order line it was paid on.
          const created = await createOrder(mapped, resolvedItems, customerId, connection);

          await importParticipantsForOrder(
            wcOrder,
            mapped,
            customerId,
            nationalNumberEnabled,
            created.orderItemIds,
            connection
          );
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

      // The parent's (payer's) national number, ticket field
      // "Rijksregisternummer ouder (fiscaal attest)" (hard-coded: this import
      // is specific to this WooCommerce shop). Take the digits, dots, dashes
      // and slashes after the colon; "/" means not filled in. Only a valid
      // Belgian national number is kept.
      const payerNationalNumberMatch =
        value.match(/Rijksregisternummer ouder \(fiscaal attest\):\s*([0-9.\-/ ]+)/) ??
        value.match(/Rijksregisternummer ouder[^:]*:\s*([0-9.\-/ ]+)/);

      const rawBirthDate = birthDateMatch?.[1]?.trim();
      const rawNationalNumber = nationalNumberMatch?.[1]?.trim();
      const payerDigits = (payerNationalNumberMatch?.[1] ?? '').replace(/\D/g, '');
      const payerNationalNumber = isValidNationalNumber(payerDigits) ? payerDigits : null;
      if (payerDigits && !payerNationalNumber) {
        debug(`Ignoring invalid parent national number on a ticket: ${payerDigits}`);
      }

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
        nationalNumber,
        payerNationalNumber
      };
    });
}

async function findOrCreateParticipant(
  participant: ImportedParticipant,
  customerId: number | null,
  nationalNumberEnabled: boolean
): Promise<number> {
  // First try to find the participant by national number.
  // The national number is the strongest identifier we have.
  if (nationalNumberEnabled && participant.nationalNumber) {
    const existingByNationalNumber = await select('participant_id')
      .from('participant')
      .where('national_number', '=', participant.nationalNumber)
      .load(pool);

    if (existingByNationalNumber) {
      return existingByNationalNumber.participant_id;
    }
  }

  // Try to find the participant by name + birth date.
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

  // If WooCommerce has a birth date but the existing participant
  // doesn't have one yet, find the participant by name and fill it in.
  if (participant.birthDate) {
    const existingWithoutBirthDate = await select('participant_id')
      .from('participant')
      .where('first_name', '=', participant.firstName)
      .and('last_name', '=', participant.lastName)
      .load(pool);

    if (existingWithoutBirthDate) {
      await update('participant')
        .given({
          birth_date: participant.birthDate
        })
        .where(
          'participant_id',
          '=',
          existingWithoutBirthDate.participant_id
        )
        .execute(pool);

      return existingWithoutBirthDate.participant_id;
    }
  }

  // Build participant data.
  const data: any = {
    first_name: participant.firstName,
    last_name: participant.lastName,
    customer_id: customerId
  };

  if (participant.birthDate) {
    data.birth_date = participant.birthDate;
  }

  // Only add national-number fields when the extension is enabled.
  if (nationalNumberEnabled) {
    if (participant.nationalNumber) {
      data.national_number = participant.nationalNumber;
    } else {
      data.national_number_not_applicable = true;
    }
  }

  try {
    const created = await createParticipant(data);

    return created.insertId;
  } catch (error) {
    const message = (error as Error).message;

    // Handle a participant that was created between our lookup
    // and the create operation.
    if (message.includes('Participant already exists')) {
      const existingParticipant = await query.load(pool);

      if (existingParticipant) {
        return existingParticipant.participant_id;
      }

      // It may be an existing participant without a birth date.
      if (participant.birthDate) {
        const existingWithoutBirthDate = await select('participant_id')
          .from('participant')
          .where('first_name', '=', participant.firstName)
          .and('last_name', '=', participant.lastName)
          .load(pool);

        if (existingWithoutBirthDate) {
          await update('participant')
            .given({
              birth_date: participant.birthDate
            })
            .where(
              'participant_id',
              '=',
              existingWithoutBirthDate.participant_id
            )
            .execute(pool);

          return existingWithoutBirthDate.participant_id;
        }
      }
    }

    // If the national-number extension is enabled but the imported
    // national number is invalid, create the participant without it.
    if (
      nationalNumberEnabled &&
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

async function createOrUpdateRegistration(
  participantId: number,
  productId: number,
  productVariantId: number | null,
  connection: PoolClient
): Promise<number> {
  const registrations = await select('*')
    .from('registration')
    .where(
      'registration_participant_id',
      '=',
      participantId
    )
    .and(
      'registration_product_id',
      '=',
      productId
    )
    .execute(connection);

  // The exact participant/product/variant registration already exists.
  const exactRegistration = registrations.find(
    (registration: any) =>
      (registration.product_variant_id ?? null) === productVariantId
  );

  if (exactRegistration) {
    return exactRegistration.registration_id;
  }

  // A WooCommerce variant exists, but the old registration does not have
  // its (season) variant assigned yet: it has no variant at all, or it is on
  // the pre-season version of the same week (imported before seasons
  // existed). Move it to this order's season variant.
  if (productVariantId !== null) {
    const registrationsWithoutVariant: any[] = [];
    for (const registration of registrations) {
      if (
        registration.product_variant_id == null ||
        (await isUnseasonedTwin(registration.product_variant_id, productVariantId))
      ) {
        registrationsWithoutVariant.push(registration);
      }
    }

    if (registrationsWithoutVariant.length === 1) {
      await update('registration')
        .given({
          product_variant_id: productVariantId
        })
        .where(
          'registration_id',
          '=',
          registrationsWithoutVariant[0].registration_id
        )
        .execute(connection);

      return registrationsWithoutVariant[0].registration_id;
    }

    if (registrationsWithoutVariant.length > 1) {
      throw new Error(
        `Cannot safely assign variant ${productVariantId} to participant ` +
        `${participantId} and product ${productId}: multiple registrations ` +
        `without a variant were found.`
      );
    }
  }

  const created = await createRegistration({
    registration_participant_id: participantId,
    registration_product_id: productId,
    product_variant_id: productVariantId
  }, { routeId: 'importOrders' });
  return created.insertId;
}

// Links a registration to the order line it was paid on: the same
// order_item_registration row native checkout writes in
// orderCreator.saveOrderItems. Without it the registration has no amount
// (needed for the fiscal attests). Idempotent: an already-linked registration
// is left as it is.
async function linkRegistrationToOrderItem(
  orderItemId: number,
  registrationId: number,
  participant: ImportedParticipant,
  customerId: number | null,
  connection: PoolClient
): Promise<void> {
  const hasPayerColumn = await columnExists(connection, 'order_item_registration', 'payer_national_number');
  const existing = await select('order_item_registration_id')
    .from('order_item_registration')
    .where('registration_id', '=', registrationId)
    .load(connection, false);
  if (existing) {
    // Already linked (earlier run): fill in the parent's national number when missing.
    if (hasPayerColumn && participant.payerNationalNumber) {
      await connection.query(
        `UPDATE order_item_registration
         SET payer_national_number = $1::text,
             extra_data = COALESCE(extra_data::jsonb, '{}'::jsonb) || jsonb_build_object('payer_national_number', $1::text)
         WHERE order_item_registration_id = $2
           AND (payer_national_number IS NULL OR payer_national_number = '')`,
        [participant.payerNationalNumber, existing.order_item_registration_id]
      );
    }
    await savePayerOnCustomer(connection, customerId, participant.payerNationalNumber);
    return;
  }

  const extraData: Record<string, string> = {};
  if (participant.birthDate) {
    extraData.birth_date = participant.birthDate;
  }
  if (participant.nationalNumber) {
    extraData.national_number = participant.nationalNumber;
  }
  if (participant.payerNationalNumber) {
    extraData.payer_national_number = participant.payerNationalNumber;
  }

  await insert('order_item_registration')
    .given({
      order_item_id: orderItemId,
      registration_id: registrationId,
      first_name: participant.firstName,
      last_name: participant.lastName,
      customer_id: customerId,
      extra_data: Object.keys(extraData).length > 0 ? JSON.stringify(extraData) : null,
      // Column from the belgian-administration plugin; ignored by the query
      // builder when it doesn't exist.
      ...(hasPayerColumn && participant.payerNationalNumber
        ? { payer_national_number: participant.payerNationalNumber }
        : {})
    })
    .execute(connection, false);
  await savePayerOnCustomer(connection, customerId, participant.payerNationalNumber);
}

const columnCache = new Map<string, boolean>();
async function columnExists(connection: PoolClient, table: string, column: string): Promise<boolean> {
  const key = `${table}.${column}`;
  if (!columnCache.has(key)) {
    const result = await connection.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column]
    );
    columnCache.set(key, result.rows.length > 0);
  }
  return columnCache.get(key)!;
}

// The order customer is the parent who filled in the ticket: their national
// number (customer.national_number, belgian-administration plugin) is filled
// when still empty - a number entered in EverCamps is never overwritten.
async function savePayerOnCustomer(
  connection: PoolClient,
  customerId: number | null,
  payerNationalNumber: string | null
): Promise<void> {
  if (!customerId || !payerNationalNumber) {
    return;
  }
  if (!(await columnExists(connection, 'customer', 'national_number'))) {
    return;
  }
  await connection.query(
    `UPDATE customer SET national_number = $1
     WHERE customer_id = $2 AND (national_number IS NULL OR national_number = '')`,
    [payerNationalNumber, customerId]
  );
}

// For an order imported earlier: find the local order_item of each WC line
// item (order_item doesn't store the WC line id). Matched on product, then on
// the order's season variant. An order_item without a variant (imported
// before variants were wired) or on the pre-season version of the same week
// also matches, and is moved to the season variant. Each order_item is used
// once, so two lines of the same product map to two order_items.
async function mapExistingOrderItems(
  orderId: number,
  items: OrderItemImportData[],
  orderDate: string,
  connection: PoolClient
): Promise<OrderItemIdsByLine> {
  const orderItems = await select('order_item_id', 'product_id', 'product_variant_id')
    .from('order_item')
    .where('order_item_order_id', '=', orderId)
    .execute(connection, false);

  const used = new Set<number>();
  const result: OrderItemIdsByLine = new Map();

  for (const item of items) {
    const productId = await resolveLocalProductId(item.externalProductId, item.product_name);
    if (!productId) {
      continue;
    }
    const variantId = await resolveOrderLineVariantId(item, productId, orderDate);
    const candidates = orderItems.filter(
      (row: any) => !used.has(row.order_item_id) && row.product_id === productId
    );
    let match =
      candidates.find((row: any) => row.product_variant_id === variantId) ||
      candidates.find((row: any) => row.product_variant_id == null);
    if (!match && variantId !== null) {
      for (const row of candidates) {
        if (await isUnseasonedTwin(row.product_variant_id, variantId)) {
          match = row;
          break;
        }
      }
    }
    if (!match) {
      debug(
        `No local order_item found for WooCommerce line item ${item.externalLineItemId} ` +
        `of order ${orderId}; its registrations are not linked.`
      );
      continue;
    }
    used.add(match.order_item_id);
    result.set(item.externalLineItemId, match.order_item_id);

    if (variantId !== null && match.product_variant_id !== variantId) {
      await update('order_item')
        .given({ product_variant_id: variantId })
        .where('order_item_id', '=', match.order_item_id)
        .execute(connection, false);
    }
  }
  return result;
}

async function importParticipantsForOrder(
  wcOrder: WooCommerceOrder,
  mapped: OrderImportData,
  customerId: number | null,
  nationalNumberEnabled : boolean,
  orderItemIds: OrderItemIdsByLine,
  connection: PoolClient
): Promise<void> {
  for (const item of mapped.items) {
    const productId = await resolveLocalProductId(
      item.externalProductId, item.product_name
    );
    // The line's season (year of its WC product) decides the kampweek variant.
    const productVariantId = await resolveOrderLineVariantId(
      item,
      productId,
      wcOrder.date_created
    );

    if (!productId) {
      debug(
        `Skipping participants for line item ${item.externalLineItemId}: ` +
        `no local product found for WooCommerce product ${item.externalProductId}`
      );

      continue;
    }

    if (item.externalVariationId && !productVariantId) {
      throw new Error(
        `No local variant mapping found for WooCommerce variation ` +
        `${item.externalVariationId}.`
      );
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
        customerId,
        nationalNumberEnabled
      );

      const registrationId = await createOrUpdateRegistration(
        participantId,
        productId,
        productVariantId,
        connection
      );

      const orderItemId = orderItemIds.get(item.externalLineItemId);
      if (orderItemId) {
        await linkRegistrationToOrderItem(
          orderItemId,
          registrationId,
          participant,
          customerId,
          connection
        );
      }
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

  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);

  const date = new Date(
    yearNumber,
    monthNumber - 1,
    dayNumber
  );

  if (
    date.getFullYear() !== yearNumber ||
    date.getMonth() !== monthNumber - 1 ||
    date.getDate() !== dayNumber
  ) {
    debug(`Invalid birth date from WooCommerce: ${value}`);
    return null;
  }

  return `${year}-${month}-${day}`;
}