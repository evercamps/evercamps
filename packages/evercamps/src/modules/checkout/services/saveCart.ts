import {
  commit,
  del,
  insert,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../lib/postgres/connection.js';
import { Cart } from './cart/Cart.js';

/**
 * @param {Cart} cart
 * @returns {Promise<Number|null>}
 * @throws {Error}
 * */
export const saveCart = async (cart: Cart) => {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const items = cart.getItems();
    let cartId;
    if (items.length === 0) {
      // Delete cart if existed
      if (cart.getData('cart_id')) {
        await del('cart')
          .where('cart_id', '=', cart.getData('cart_id'))
          .execute(connection, false);
      }
      await commit(connection);
      return null;
    } else {
      if (cart.getData('cart_id')) {
        await update('cart')
          .given(cart.exportData())
          .where('cart_id', '=', cart.getData('cart_id'))
          .execute(connection, false);
        cartId = cart.getData('cart_id');
      } else {
        const c = await insert('cart')
          .given(cart.exportData())
          .execute(connection, false);
        cartId = c.insertId;
      }

      // Get current items from database
      const currentItems = await select()
        .from('cart_item')
        .where('cart_id', '=', cartId)
        .execute(connection, false);

      // Delete items that are not in cart
      await Promise.all(
        currentItems.map(async (i) => {
          if (!cart.getItem(i.uuid)) {
            await del('cart_item')
              .where('cart_item_id', '=', i.cart_item_id)
              .execute(connection, false);
          }
        })
      );

      await Promise.all(
        items.map(async (item) => {
          let cartItemId;
          if (/^\d+$/.test(item.getData('cart_item_id'))) {
            await update('cart_item')
              .given(item.export())
              .where('cart_item_id', '=', item.getData('cart_item_id'))
              .execute(connection, false);
            cartItemId = item.getData('cart_item_id');
          } else {
            const insertedItem = await insert('cart_item')
              .given({
                ...item.export(),
                cart_id: cart.getData('cart_id') || cartId
              })
              .execute(connection, false);
            cartItemId = insertedItem.insertId;
          }
          
          
          // Fetch current registrations from DB
          const currentRegs = await select()
            .from('cart_item_registration')
            .where('cart_item_id', '=', cartItemId)
            .execute(connection, false);

          const newRegs = item.getData('registrations') || [];

          // Map by ID for easier comparison
          const currentById = new Map(currentRegs.map(r => [r.cart_item_registration_id, r]));
          const newById = new Map(newRegs.map(r => [r.cartItemRegistrationId, r]));

          // Delete regs that are in DB but not in new list
          for (const r of currentRegs) {
            if (!newById.has(r.cart_item_registration_id)) {
              await del('cart_item_registration')
                .where('cart_item_registration_id', '=', r.cart_item_registration_id)
                .execute(connection, false);
            }
          }

          // Insert regs that are new
          for (const r of newRegs) {
            if (!r.cartItemRegistrationId) {
              await insert('cart_item_registration')
                .given({
                  cart_item_id: cartItemId,
                  first_name: r.firstName,
                  last_name: r.lastName
                })
                .execute(connection, false);
            }
          }

          // Update regs that exist but changed
          for (const r of newRegs) {
            if (r.cartItemRegistrationId && currentById.has(r.cartItemRegistrationId)) {
              const existing = currentById.get(r.cartItemRegistrationId);
              if (existing.first_name !== r.firstName || existing.last_name !== r.lastName) {
                await update('cart_item_registration')
                  .given({
                    first_name: r.firstName,
                    last_name: r.lastName
                  })
                  .where('cart_item_registration_id', '=', r.cartItemRegistrationId)
                  .execute(connection, false);
              }
            }
          }
        })
      );

      await commit(connection);
      return cartId;
    }
  } catch (error) {
    await rollback(connection);
    throw error;
  }
};
