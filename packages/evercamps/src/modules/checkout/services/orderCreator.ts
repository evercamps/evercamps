import {
  commit,
  getConnection,
  insert,
  PoolClient,
  rollback,
  select,
  sql,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { hookable } from '../../../lib/util/hookable.js';
import { PaymentStatus, ShipmentStatus } from '../../../types/order.js';
import { resolveOrderStatus } from '../../oms/services/updateOrderStatus.js';
import { Cart } from './cart/Cart.js';
import { validateBeforeCreateOrder } from './orderValidator.js';
import { getSetting } from '../../setting/services/setting.js';

async function disableCart(cartId: number, connection: PoolClient) {
  const cart = await update('cart')
    .given({ status: 0 })
    .where('cart_id', '=', cartId)
    .execute(connection);
  return cart;
}

async function saveOrder(cart: Cart, connection: PoolClient, context: { skipShippingValidation?: boolean } = {}) {
  const { skipShippingValidation } = context;
  const shipmentStatusList = getConfig(
    'oms.order.shipmentStatus',
    {}
  ) as Record<string, ShipmentStatus>;
  const paymentStatusList = getConfig(
    'oms.order.paymentStatus',
    {}
  ) as Record<string, PaymentStatus>;
  let defaultShipmentStatus;
  Object.keys(shipmentStatusList).forEach((key) => {
    if (shipmentStatusList[key].isDefault) {
      defaultShipmentStatus = key;
    }
  });

  let defaultPaymentStatus;
  Object.keys(paymentStatusList).forEach((key) => {
    if (paymentStatusList[key].isDefault) {
      defaultPaymentStatus = key;
    }
  });
  // Save the shipping address
  let shipAddrId = null;
  if (!skipShippingValidation) {
    const cartShippingAddress = await select()
    .from('cart_address')
    .where('cart_address_id', '=', cart.getData('shipping_address_id'))
    .load(connection);
    delete cartShippingAddress.uuid;
    const shipAddr = await insert('order_address')
      .given(cartShippingAddress)
      .execute(connection);
    shipAddrId = shipAddr.insertId;
  }  
  // Save the billing address
  const cartBillingAddress = await select()
    .from('cart_address')
    .where('cart_address_id', '=', cart.getData('billing_address_id'))
    .load(connection);
  delete cartBillingAddress.uuid;
  const billAddr = await insert('order_address')
    .given(cartBillingAddress)
    .execute(connection);

  const previous = await select('order_id')
    .from('order')
    .orderBy('order_id', 'DESC')
    .limit(0, 1)
    .execute(connection);

  const orderStatus = resolveOrderStatus(
    defaultPaymentStatus ?? '',
    defaultShipmentStatus ?? ''
  );

  // Save order to DB
  const order = await insert('order')
    .given({
      ...cart.exportData(),
      uuid: uuidv4().replace(/-/g, ''),
      order_number:
        10000 + parseInt(previous[0] ? previous[0].order_id : 0, 10) + 1,
      // FIXME: Must be structured
      shipping_address_id: shipAddrId,
      billing_address_id: billAddr.insertId,
      status: orderStatus,
      payment_status: defaultPaymentStatus,
      shipment_status: defaultShipmentStatus
    })
    .execute(connection);
  return order;
}

interface ParticipantCheckoutField {
  code: string;
  useForUniqueness: boolean;
}

function parseExtraData(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  if (typeof raw === 'object') return raw as Record<string, string>;
  return {};
}

async function saveOrderItems(
  cart: Cart,
  orderId: number,
  connection: PoolClient
) {
  const rawFields = await getSetting('participant_checkout_fields', null);
  const allFields: ParticipantCheckoutField[] = (() => {
    try {
      const parsed = typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  })();
  const uniquenessFields = allFields.filter((f) => f.useForUniqueness);

  const items = cart.getItems();
  const savedItems = await Promise.all(
    items.map(async (item) => {
      const orderItem = await insert('order_item')
        .given({
          ...item.export(),
          uuid: uuidv4().replace(/-/g, ''),
          order_item_order_id: orderId
        })
        .execute(connection);

      const registrations = item.getData('registrations') || [];
      for (const reg of registrations) {
        const extraData = parseExtraData(reg.extraData);

        let participantQuery = select()
          .from('participant')
          .where('first_name', '=', reg.firstName)
          .and('last_name', '=', reg.lastName);

        for (const field of uniquenessFields) {
          participantQuery = participantQuery.and(field.code, '=', extraData[field.code] ?? null);
        }

        let participant = await participantQuery.load(connection);

        let participantId: number;
        if (participant) {
          participantId = participant.participant_id;
        } else {
          const extraInsert = Object.fromEntries(
            uniquenessFields.map((f) => [f.code, extraData[f.code] ?? null])
          );
          participant = await insert('participant')
            .given({
              first_name: reg.firstName,
              last_name: reg.lastName,
              ...extraInsert
            })
            .execute(connection);
          participantId = participant.insertId;
        }

        const registration = await insert('registration')
          .given({
            registration_participant_id: participantId,
            registration_product_id: item.getData('product_id')
          })
          .execute(connection);

        const registrationId = registration.insertId;

        await insert('order_item_registration')
          .given({
            order_item_id: orderItem.insertId,
            first_name: reg.firstName,
            last_name: reg.lastName,
            registration_id: registrationId,
            extra_data: Object.keys(extraData).length > 0 ? JSON.stringify(extraData) : null
          })
          .execute(connection);

        const customerId = cart.getData('customer_id');
        if (customerId) {
          await update('participant')
            .given({ customer_id: customerId })
            .where('participant_id', '=', participantId)
            .and('customer_id', 'IS', sql('NULL'))
            .execute(connection);
        }
      }

      return orderItem;
    })
  );
  return savedItems;
}

async function saveOrderActivity(orderID: number, connection: PoolClient) {
  // Save order activities
  await insert('order_activity')
    .given({
      order_activity_order_id: orderID,
      comment: 'Order created',
      customer_notified: 0 // TODO: check config of SendGrid
    })
    .execute(connection);
}

function allItemsManagedByRegistration(cart: Cart): boolean {
  return cart.getItems().every(item => !!item.getData('manageRegistrations'));
}

async function createOrderFunc(cart: Cart) {
  // Start creating order
  const connection = await getConnection(pool);
  try {
    await startTransaction(connection);
    const skipShippingValidation = allItemsManagedByRegistration(cart);    
    // Validate the cart
    const validateResult = await validateBeforeCreateOrder(cart);
    if (!validateResult.valid) {
      throw new Error(
        `Order validation failed: ${validateResult.errors.join('\r\n-- ')}`
      );
    }
    // Save order to DB
    const order = await hookable(saveOrder, { cart })(cart, connection, { skipShippingValidation });

    // Save order items
    await hookable(saveOrderItems, { cart })(cart, order.insertId, connection);

    // Save order activity
    await hookable(saveOrderActivity, { cart })(order.insertId, connection);

    // Disable the cart
    await hookable(disableCart, { cart })(cart.getData('cart_id'), connection);

    await commit(connection);
    return order;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Create a new order from the cart
 * @param cart
 * @returns {Promise<Object>} - The created order object
 * @throws {Error} - If the order creation fails due to validation errors or database issues
 */
export const createOrder = async (cart: Cart) => {
  const order = await hookable(createOrderFunc, {
    cart
  })(cart);
  return order;
};
