import { hookable } from '../../../lib/util/hookable.js';
import { Cart, Item } from './cart/Cart.js';

async function removeCartItemRegistration(cart: Cart, itemUuid: string, registrationId: number) {
  const item = cart.getItem(itemUuid);

  if (!item) {
    throw new Error('Cart item not found');
  }

  const registrations = item.getData('registrations') || [];

  const newRegs = registrations.filter(
    (r) => r.cartItemRegistrationId !== Number(registrationId)
  );  

  if (newRegs.length === registrations.length) {
    throw new Error('Registration not found for this cart item');
  }

  await item.setData('registrations', newRegs);

  const items = cart.getItems().map((i) =>
    i.getData('uuid') === itemUuid ? item : i
  );
  await cart.setData('items', items, true);

  return item;
}

/**
 * Removes a registration from a cart item by UUID + registrationId
 * @param {Cart} cart - The cart object.
 * @param {string} itemUuid - The UUID of the cart item.
 * @param {number} registrationId - The ID of the registration to remove.
 * @returns {Promise<Item>} - The updated cart item.
 */
export default async (
  cart: Cart,
  itemUuid: string,
  registrationId: number,
  context: Record<string, unknown>
): Promise<Item> => {
  return hookable(removeCartItemRegistration, context)(
    cart,
    itemUuid,
    registrationId
  );
};
