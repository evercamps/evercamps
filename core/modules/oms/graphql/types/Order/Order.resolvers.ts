import { select } from '@evershop/postgres-query-builder';
import type { Pool, PoolClient } from 'pg';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getConfig } from '../../../../../lib/util/getConfig.js';
import { getOrdersBaseQuery } from '../../../services/getOrdersBaseQuery.js';

interface Context {
  pool: Pool | PoolClient;
}

interface Order {
  uuid: string;
  orderId: number;
  shippingAddressId?: number;
  billingAddressId?: number;
  shipmentStatus?: string;
  paymentStatus?: string;
  status?: string;
  customerId?: number;
}

interface OrderItem {
  orderItemId: number;
  productId: number;
  lineTotalInclTax: number;
  lineTotal: number;
}

interface OrderItemRegistration {
  registrationId: number;
}

interface Customer {
  customerId: number;
}

export default {
  Query: {
    order: async (
      _: unknown,
      { uuid }: { uuid: string },
      { pool }: Context
    ) => {
      const query = getOrdersBaseQuery();
      query.where('uuid', '=', uuid);

      const order = await query.load(pool);

      return order ? camelCase(order) : null;
    }
  },

  Order: {
    items: async (
      { orderId }: Order,
      _: unknown,
      { pool }: Context
    ) => {
      const items = await select()
        .from('order_item')
        .where('order_item_order_id', '=', orderId)
        .execute(pool);

      return items.map((item) => camelCase(item));
    },

    shippingAddress: async (
      { shippingAddressId }: Order,
      _: unknown,
      { pool }: Context
    ) => {
      const address = await select()
        .from('order_address')
        .where('order_address_id', '=', shippingAddressId)
        .load(pool);

      return address ? camelCase(address) : null;
    },

    billingAddress: async (
      { billingAddressId }: Order,
      _: unknown,
      { pool }: Context
    ) => {
      const address = await select()
        .from('order_address')
        .where('order_address_id', '=', billingAddressId)
        .load(pool);

      return address ? camelCase(address) : null;
    },

    activities: async (
      { orderId }: Order,
      _: unknown,
      { pool }: Context
    ) => {
      const query = select().from('order_activity');

      query.where('order_activity_order_id', '=', orderId);
      query.orderBy('order_activity_id', 'DESC');

      const activities = await query.execute(pool);

      return activities
        ? activities.map((activity) => camelCase(activity))
        : null;
    },

    shipment: async (
      { orderId, uuid }: Order,
      _: unknown,
      { pool }: Context
    ) => {
      const shipment = await select()
        .from('shipment')
        .where('shipment_order_id', '=', orderId)
        .load(pool);

      return shipment
        ? { ...camelCase(shipment), orderUuid: uuid }
        : null;
    },

    shipmentStatus: ({ shipmentStatus }: Order) => {
      const statusList = getConfig('oms.order.shipmentStatus', {}) as Record<
        string,
        Record<string, unknown>
      >;

      const status = statusList[shipmentStatus ?? ''] || {
        name: 'Unknown',
        code: shipmentStatus,
        badge: 'default',
        progress: 'incomplete'
      };

      return {
        ...status,
        code: shipmentStatus
      };
    },

    paymentStatus: ({ paymentStatus }: Order) => {
      const statusList = getConfig('oms.order.paymentStatus', {}) as Record<
        string,
        Record<string, unknown>
      >;

      const status = statusList[paymentStatus ?? ''] || {
        name: 'Unknown',
        code: paymentStatus,
        badge: 'default',
        progress: 'incomplete'
      };

      return {
        ...status,
        code: paymentStatus
      };
    },

    status: ({ status }: Order) => {
      const statusList = getConfig('oms.order.status', {}) as Record<
        string,
        Record<string, unknown>
      >;

      const statusObj = statusList[status ?? ''] || {
        name: 'Unknown',
        code: status,
        badge: 'default',
        progress: 'incomplete'
      };

      return {
        ...statusObj,
        code: status
      };
    }
  },

  Customer: {
    orders: async (
      { customerId }: Customer,
      _: unknown,
      { pool }: Context
    ) => {
      const orders = await select()
        .from('order')
        .where('order.customer_id', '=', customerId)
        .execute(pool);

      return orders.map((row) => camelCase(row));
    }
  },

  OrderItem: {
    registrations: async (
      { orderItemId }: OrderItem,
      _: unknown,
      { pool }: Context
    ) => {
      const items = await select()
        .from('order_item_registration')
        .where('order_item_id', '=', orderItemId)
        .execute(pool);

      return items.map((item) => camelCase(item));
    },

    productUrl: async (
      { productId }: OrderItem,
      _: unknown,
      { pool }: Context
    ) => {
      const product = await select()
        .from('product')
        .where('product_id', '=', productId)
        .load(pool);

      return product
        ? buildUrl('productEdit', { id: product.uuid })
        : null;
    },

    total: ({ lineTotalInclTax }: OrderItem) => lineTotalInclTax,

    subTotal: ({ lineTotal }: OrderItem) => lineTotal
  },

  OrderItemRegistration: {
    participant: async (
      { registrationId }: OrderItemRegistration,
      _: unknown,
      { pool }: Context
    ) => {
      const query = select('participant.uuid')
        .from('participant');

      query
        .leftJoin('registration')
        .on(
          'registration.registration_participant_id',
          '=',
          'participant.participant_id'
        );

      const participant = await query
        .where('registration.registration_id', '=', registrationId)
        .load(pool);

      return participant ? camelCase(participant) : null;
    }
  }
};