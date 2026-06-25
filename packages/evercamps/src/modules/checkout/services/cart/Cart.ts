import { select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getValue, getValueSync } from '../../../../lib/util/registry.js';
import addCartItem from '../../../../modules/checkout/services/addCartItem.js';
import { DataObject } from '../../../../modules/checkout/services/cart/DataObject.js';
import removeCartItem from '../../../../modules/checkout/services/removeCartItem.js';
import removeCartItemRegistration from '../../../../modules/checkout/services/removeCartItemRegistration.js';
import updateCartItemQty from '../../../../modules/checkout/services/updateCartItemQty.js';
import updateCartItemRegistration from '../../../../modules/checkout/services/updateCartItemRegistration.js';

interface CartItemRegistrationData {
  cartItemRegistrationId: number;
  cartItemId: number;
  firstName: string;
  lastName: string;
  extraData: string | null;
}

export class Item extends (DataObject as any) {
  readonly #cart: Cart;
  #product: any;

  constructor(cart: Cart, initialData: Record<string, any> = {}) {
    super(getValueSync('cartItemFields', [], {}), initialData);
    this.#cart = cart;
  }

  async getProduct(): Promise<any> {
    if (this.#product) {
      return this.#product;
    }
    const loaderFunction = getValueSync('cartItemProductLoaderFunction', null as any, {}) as (id: any) => Promise<any>;
    const product = await loaderFunction(this.getData('product_id'));
    this.#product = product;
    return product;
  }

  getId(): string {
    return this.getData('uuid');
  }

  getCart(): Cart {
    return this.#cart;
  }
}

export class Cart extends (DataObject as any) {
  constructor(initialData: Record<string, any> = {}) {
    const fields = getValueSync('cartFields', [], {});
    super(fields, initialData);
  }

  getId(): string {
    return this.getData('uuid');
  }

  getItems(): Item[] {
    return this.getData('items') ?? [];
  }

  async addItem(productID: number, qty: number, context: Record<string, unknown> = {}): Promise<Item> {
    return addCartItem(this, productID, qty, context);
  }

  async updateCartItemRegistration(
    uuid: string,
    registration_id: number,
    context: Record<string, unknown> = {}
  ): Promise<Item> {
    return updateCartItemRegistration(this, uuid, registration_id, context);
  }

  async removeItem(uuid: string, context: Record<string, unknown> = {}): Promise<Item> {
    return removeCartItem(this, uuid, context);
  }

  async removeCartItemRegistration(
    uuid: string,
    registration_id: number,
    context: Record<string, unknown> = {}
  ): Promise<Item> {
    const removedItemRegistration = await removeCartItemRegistration(this, uuid, registration_id, context);
    if ((removedItemRegistration.getData('registrations') || []).length === 0) {
      return removeCartItem(this, uuid, context);
    } else {
      return updateCartItemQty(this, uuid, String(1), 'decrease', context);
    }
  }

  async removeItemBySku(sku: string, context: Record<string, unknown> = {}): Promise<Item> {
    const items = this.getItems();
    const item = items.find((i: Item) => i.getData('product_sku') === sku);
    if (item) {
      return removeCartItem(this, item.getData('uuid'), context);
    }
    throw new Error('Item not found');
  }

  async updateItemQty(
    uuid: string,
    qty: number,
    action: 'increase' | 'decrease',
    context: Record<string, unknown> = {}
  ): Promise<Item> {
    return updateCartItemQty(this, uuid, String(qty), action, context);
  }

  async updateItemQtyBySku(
    sku: string,
    qty: number,
    action: 'increase' | 'decrease',
    context: Record<string, unknown> = {}
  ): Promise<Item> {
    const items = this.getItems();
    const item = items.find((i: Item) => i.getData('product_sku') === sku);
    if (item) {
      return updateCartItemQty(this, item.getData('uuid'), String(qty), action, context);
    }
    throw new Error('Item not found');
  }

  async createItem(productId: number, qty: number): Promise<Item> {
    if (typeof qty !== 'number' || Number.isNaN(qty) || qty <= 0) {
      throw new Error(translate('Invalid quantity'));
    }
    const item = new Item(this, { product_id: productId, qty });
    await item.build();
    if (item.hasError()) {
      throw new Error(Object.values(item.getErrors())[0] as string);
    }
    return item;
  }

  getItem(uuid: string): Item | undefined {
    const items = this.getItems();
    return items.find((item: Item) => item.getData('uuid') === uuid);
  }

  hasItemError(): boolean {
    return this.getItems().some((i: Item) => i.hasError());
  }

  hasError(): boolean {
    return super.hasError() || this.hasItemError();
  }

  exportData(): Record<string, any> {
    const data = this.export();
    data.errors = Object.values(this.getErrors());
    data.items = this.getItems().map((item: Item) => {
      const itemData = item.export();
      itemData.errors = Object.values(item.getErrors());
      return itemData;
    });
    return data;
  }
}

export async function createNewCart(initialData: Record<string, any>): Promise<Cart> {
  const cart = new Cart(initialData);
  await cart.build();
  return cart;
}

export async function getCart(uuid: string): Promise<Cart> {
  const cart = await select().from('cart').where('uuid', '=', uuid).load(pool);
  if (!cart || cart.status !== true) {
    throw new Error('Cart not found');
  }
  const cartObject = new Cart(cart);

  const items: Record<string, any>[] = await select()
    .from('cart_item')
    .where('cart_id', '=', cart.cart_id)
    .execute(pool);

  const cartItemIds = items.map((i) => i.cart_item_id);
  const registrations: Record<string, any>[] = await select()
    .from('cart_item_registration')
    .where('cart_item_id', 'IN', cartItemIds)
    .execute(pool);

  const registrationsByItem: Record<number, CartItemRegistrationData[]> = {};
  registrations.forEach((r) => {
    if (!registrationsByItem[r.cart_item_id]) registrationsByItem[r.cart_item_id] = [];
    registrationsByItem[r.cart_item_id].push({
      cartItemRegistrationId: r.cart_item_registration_id,
      cartItemId: r.cart_item_id,
      firstName: r.first_name,
      lastName: r.last_name,
      extraData: r.extra_data ?? null
    });
  });

  const cartItems: Item[] = [];
  await Promise.all(
    items.map(async (item) => {
      const product = await select('product.manage_registrations')
        .from('product')
        .where('product_id', '=', item.product_id)
        .load(pool);

      const cartItem = new Item(cartObject, {
        ...item,
        registrations: registrationsByItem[item.cart_item_id] || [],
        manageRegistrations: product?.manage_registrations
      });
      await cartItem.build();
      cartItems.push(cartItem);
    })
  );

  const finalItems = await getValue('cartInitialItems', cartItems, {
    cart: cartObject,
    unique: uuidv4()
  });
  await cartObject.setData('items', finalItems);
  return cartObject;
}
