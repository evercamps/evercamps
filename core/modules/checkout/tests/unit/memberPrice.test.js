process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import config from 'config';
import { products } from '../products.js';
import { addProcessor } from '../../../../lib/util/registry.js';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

// Member price (ADR-0006): a registration with a membership number pays the
// variant's member price, and every registration is its own cart line.
// Only while member prices are switched on in Camp settings (#210).

const settings = {};
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (name, defaultValue) => (name in settings ? settings[name] : defaultValue),
  refreshSetting: async () => {}
}));
await import('../basicSetup.js');
const { Cart } = await import('../../services/cart/Cart.js');

beforeEach(() => {
  settings.memberPricesEnabled = '1';
});

config.util.setModuleDefaults('pricing', {
  tax: {
    price_including_tax: false
  }
});

const CAMP = 100;
products.push(
  {
    product_id: CAMP,
    name: 'Grommets surfkamp',
    sku: 'CAMP',
    price: 230,
    status: true,
    qty: 100,
    manage_stock: true,
    tax_class: null
  },
  {
    product_id: 101,
    name: 'T-shirt',
    sku: 'SHIRT',
    price: 20,
    status: true,
    qty: 100,
    tax_class: null
  }
);

const variants = [
  // Week 1: member price, 2 seats
  { product_variant_id: 1001, product_id: CAMP, sku: 'CAMP-W1', price: '230.0000', member_price: '210.0000', status: true, total_seats: 2, reserved_seats: 0 },
  // Week 2: no member price
  { product_variant_id: 1002, product_id: CAMP, sku: 'CAMP-W2', price: '230.0000', member_price: null, status: true, total_seats: 10, reserved_seats: 0 }
];

addProcessor('cartItemVariantLoaderFunction', () => async (productId, variantId) =>
  variants.find((v) => (variantId ? v.product_variant_id === variantId : false)) ?? null
);

function register(firstName, membershipNumber, variantId = 1001) {
  return {
    first_name: firstName,
    last_name: 'Peeters',
    product_variant_id: variantId,
    extraData: membershipNumber ? { membership_number: membershipNumber } : undefined
  };
}

describe('member price', () => {
  it('charges the member price for a registration with a membership number', async () => {
    const cart = new Cart({ status: 1 });
    const item = await cart.addItem(CAMP, 1, register('Lou', 'WWSV-12'));
    expect(item.getData('final_price')).toEqual(210);
    expect(item.getData('line_total')).toEqual(210);
  });

  it('charges the normal price without a membership number', async () => {
    const cart = new Cart({ status: 1 });
    const item = await cart.addItem(CAMP, 1, register('Lou', null));
    expect(item.getData('final_price')).toEqual(230);
  });

  it('charges the normal price when the variant has no member price', async () => {
    const cart = new Cart({ status: 1 });
    const item = await cart.addItem(CAMP, 1, register('Lou', 'WWSV-12', 1002));
    expect(item.getData('final_price')).toEqual(230);
  });

  it('gives each registration its own line, with its own price', async () => {
    const cart = new Cart({ status: 1 });
    await cart.addItem(CAMP, 1, register('Lou', 'WWSV-12'));
    await cart.addItem(CAMP, 1, register('Mats', null));
    const items = cart.getItems();
    expect(items.length).toEqual(2);
    expect(items.map((i) => i.getData('qty'))).toEqual([1, 1]);
    expect(items.map((i) => i.getData('final_price'))).toEqual([210, 230]);
    expect(items.map((i) => i.getData('registrations').length)).toEqual([1, 1]);
    expect(cart.getData('sub_total')).toEqual(440);
  });

  it('still merges items without registrations', async () => {
    const cart = new Cart({ status: 1 });
    await cart.addItem(101, 1, {});
    await cart.addItem(101, 2, {});
    const items = cart.getItems();
    expect(items.length).toEqual(1);
    expect(items[0].getData('qty')).toEqual(3);
  });

  it('reprices a line when the membership number is edited', async () => {
    const cart = new Cart({ status: 1 });
    const item = await cart.addItem(CAMP, 1, register('Lou', null));
    expect(item.getData('final_price')).toEqual(230);
    const [registration] = item.getData('registrations');
    await item.setData('registrations', [
      { ...registration, extraData: JSON.stringify({ membership_number: 'WWSV-12' }) }
    ]);
    expect(item.getData('final_price')).toEqual(210);
  });

  it('lets lines of the same variant share its seats', async () => {
    const cart = new Cart({ status: 1 });
    await cart.addItem(CAMP, 1, register('Lou', 'WWSV-12'));
    await cart.addItem(CAMP, 1, register('Mats', null));
    // Week 1 has 2 seats: a third registration doesn't fit
    await expect(cart.addItem(CAMP, 1, register('Noor', null))).rejects.toThrow(
      'We do not have enough stock'
    );
    expect(cart.getItems().length).toEqual(2);
  });
});

describe('member prices switched off (#210)', () => {
  beforeEach(() => {
    settings.memberPricesEnabled = '0';
  });

  it('charges the normal price, even with a membership number', async () => {
    const cart = new Cart({ status: 1 });
    const item = await cart.addItem(CAMP, 1, register('Lou', 'WWSV-12'));
    expect(item.getData('final_price')).toEqual(230);
  });

  it('is off when the setting was never saved', async () => {
    delete settings.memberPricesEnabled;
    const cart = new Cart({ status: 1 });
    const item = await cart.addItem(CAMP, 1, register('Lou', 'WWSV-12'));
    expect(item.getData('final_price')).toEqual(230);
  });
});
