import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { getOrdersBaseQuery } from '../../../services/getOrdersBaseQuery.js';
import { Filter, OrderCollection } from '../../../services/OrderCollection.js';

interface OrderResolverContext {
  pool: any;
}

interface OrderParent {
  uuid: string;
  customerId?: number;
}

interface ShipmentParent {
  orderUuid: string;
  uuid: string;
}

interface OrderArgs {
  filters?: Filter[];
}

export default {
  Query: {
    orders: async (
      _: unknown,
      { filters = [] }: OrderArgs
    ): Promise<OrderCollection> => {
      const query = getOrdersBaseQuery();
      const root = new OrderCollection(query);

      await root.init(filters);

      return root;
    }
  },

  Order: {
    editUrl: ({ uuid }: OrderParent): string =>
      buildUrl('orderEdit', { id: uuid }),

    createShipmentApi: ({ uuid }: OrderParent): string =>
      buildUrl('createShipment', { id: uuid }),

    cancelApi: ({ uuid }: OrderParent): string =>
      buildUrl('cancelOrder', { id: uuid }),

    customerUrl: async (
      { customerId }: OrderParent,
      _: unknown,
      { pool }: OrderResolverContext
    ): Promise<string | null> => {
      const customer = await select()
        .from('customer')
        .where('customer_id', '=', customerId)
        .load(pool);

      return customer
        ? buildUrl('customerEdit', { id: customer.uuid })
        : null;
    }
  },

  Shipment: {
    updateShipmentApi: ({
      orderUuid,
      uuid
    }: ShipmentParent): string =>
      buildUrl('updateShipment', {
        order_id: orderUuid,
        shipment_id: uuid
      })
  }
};