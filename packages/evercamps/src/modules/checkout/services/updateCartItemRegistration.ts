import { hookable } from '../../../lib/util/hookable.js';
import { Cart, Item } from './cart/Cart.js';

async function updateCartItemRegistration(cart: Cart, itemUuid: string, registrationId: number, firstName: string, lastName:string) {
  const item = cart.getItem(itemUuid);

  if (!item) {
    throw new Error("Cart item not found");
  }

  const registrations = item.getData("registrations") || [];
  
  const regIndex = registrations.findIndex(
    (r) => Number(r.cartItemRegistrationId) === Number(registrationId)
  );

  if (regIndex === -1) {
    throw new Error("Registration not found for this cart item");
  }
  
  const updatedRegs = [...registrations];
  updatedRegs[regIndex] = {
    ...updatedRegs[regIndex],
    firstName,
    lastName,
  };
  await item.setData("registrations", updatedRegs);
  
  const items = cart.getItems().map((i) =>
    i.getData("uuid") === itemUuid ? item : i
  );
  await cart.setData("items", items, true);

  return item;
}

/**
 * Updates a registration (first + last name) on a cart item by UUID + registrationId
 * @param {Cart} cart - The cart object.
 * @param {string} itemUuid - The UUID of the cart item.
 * @param {number} registrationId - The ID of the registration to update.
 * @param {string} firstName - The updated first name.
 * @param {string} lastName - The updated last name.
 * @returns {Promise<Item>} - The updated cart item.
 */
export default async (
  cart: Cart,
  itemUuid: string,
  registrationId: number,
  firstName: string,
  lastName: string,
  context: Record<string, unknown>
): Promise<Item> => {
  return hookable(updateCartItemRegistration, context)(
    cart,
    itemUuid,
    registrationId,
    firstName,
    lastName
  );
};
