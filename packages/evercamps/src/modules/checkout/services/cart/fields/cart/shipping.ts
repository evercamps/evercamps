import { select } from '@evershop/postgres-query-builder';
import axios from 'axios';
import { normalizePort } from '../../../../../../bin/lib/normalizePort.js';
import { pool } from '../../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../../lib/router/buildUrl.js';
import { getConfig } from '../../../../../../lib/util/getConfig.js';
import { getSetting } from '../../../../../../modules/setting/services/setting.js';
import { calculateTaxAmount } from '../../../../../../modules/tax/services/calculateTaxAmount.js';
import { getTaxPercent } from '../../../../../../modules/tax/services/getTaxPercent.js';
import { getTaxRates } from '../../../../../../modules/tax/services/getTaxRates.js';
import { toPrice } from '../../../toPrice.js';
import type { CartContext, CartField } from '../types.js';

export const shippingFields: CartField[] = [
  {
    key: 'shipping_zone_id',
    resolvers: [
      async function(value?: any) {
        if (!value) {
          return null;
        }
        const zone = await select()
          .from('shipping_zone')
          .where('shipping_zone_id', '=', value)
          .load(pool);
        return zone ? zone.shipping_zone_id : null;
      }
    ],
    dependencies: ['cart_id']
  },
  {
    key: 'shipping_address_id',
    resolvers: [
      async function(this: CartContext, value?: any) {
        if (!value || !this.getData('shipping_zone_id')) {
          return null;
        }
        const shippingAddress = await select()
          .from('cart_address')
          .where('cart_address_id', '=', value)
          .load(pool);
        if (!shippingAddress) {
          return null;
        }
        const shippingZoneQuery = select().from('shipping_zone');
        shippingZoneQuery
          .leftJoin('shipping_zone_province')
          .on(
            'shipping_zone_province.zone_id',
            '=',
            'shipping_zone.shipping_zone_id'
          );
        shippingZoneQuery.where(
          'shipping_zone.country',
          '=',
          shippingAddress.country
        );
        const shippingZoneProvinces = await shippingZoneQuery.execute(pool);
        if (shippingZoneProvinces.length === 0) {
          return null;
        }
        const check = shippingZoneProvinces.find(
          (p: any) =>
            p.province === shippingAddress.province || p.province === null
        );
        return check ? shippingAddress.cart_address_id : null;
      }
    ],
    dependencies: ['cart_id', 'shipping_zone_id']
  },
  {
    key: 'shippingAddress',
    resolvers: [
      async function(this: CartContext) {
        if (!this.getData('shipping_address_id')) {
          return undefined;
        }
        return {
          ...(await select()
            .from('cart_address')
            .where('cart_address_id', '=', this.getData('shipping_address_id'))
            .load(pool))
        };
      }
    ],
    dependencies: ['shipping_address_id']
  },
  {
    key: 'shipping_method',
    resolvers: [
      async function(this: CartContext, value?: any) {
        if (!value || !this.getData('shipping_address_id')) {
          return null;
        }
        const shippingMethodQuery = select().from('shipping_method');
        shippingMethodQuery
          .innerJoin('shipping_zone_method')
          .on(
            'shipping_method.shipping_method_id',
            '=',
            'shipping_zone_method.method_id'
          );
        shippingMethodQuery
          .where('uuid', '=', value)
          .and('is_enabled', '=', true)
          .and('shipping_zone_method.zone_id', '=', this.getData('shipping_zone_id'));
        const method = await shippingMethodQuery.load(pool);
        if (!method) {
          return null;
        }
        const { max, min } = method;
        const total_weight = this.getData('total_weight');
        const sub_total = this.getData('sub_total');
        let flag = false;
        if (method.condition_type === 'weight') {
          flag = total_weight >= toPrice(min) && total_weight <= toPrice(max);
        } else if (method.condition_type === 'price') {
          flag = sub_total >= toPrice(min) && sub_total <= toPrice(max);
        } else if (method.condition_type === null) {
          flag = true;
        }
        if (!flag) {
          this.setError('shipping_method', 'Shipping method is invalid');
          return null;
        }
        return method.uuid;
      }
    ],
    dependencies: ['shipping_address_id', 'sub_total', 'total_weight', 'total_qty']
  },
  {
    key: 'shipping_method_name',
    resolvers: [
      async function(this: CartContext) {
        if (!this.getData('shipping_method')) {
          return null;
        }
        const shippingMethod = await select()
          .from('shipping_method')
          .where('uuid', '=', this.getData('shipping_method'))
          .load(pool);
        return shippingMethod.name;
      }
    ],
    dependencies: ['shipping_method']
  },
  {
    key: 'shipping_fee_draft',
    resolvers: [
      async function(this: CartContext) {
        if (!this.getData('shipping_method')) {
          return 0;
        }
        const coupon = await select()
          .from('coupon')
          .where('coupon.coupon', '=', this.getData('coupon'))
          .load(pool);
        if (coupon?.free_shipping) {
          return 0;
        }
        const shippingMethodQuery = select().from('shipping_method');
        shippingMethodQuery
          .innerJoin('shipping_zone_method')
          .on(
            'shipping_method.shipping_method_id',
            '=',
            'shipping_zone_method.method_id'
          );
        shippingMethodQuery
          .where('uuid', '=', this.getData('shipping_method'))
          .and('shipping_zone_method.zone_id', '=', this.getData('shipping_zone_id'));
        const shippingMethod = await shippingMethodQuery.load(pool);
        if (shippingMethod.cost !== null) {
          return toPrice(shippingMethod.cost);
        } else if (shippingMethod.calculate_api) {
          const port = normalizePort();
          let api = `http://localhost:${port}`;
          try {
            api += buildUrl(shippingMethod.calculate_api, {
              cart_id: this.getData('uuid'),
              method_id: shippingMethod.uuid
            });
          } catch (e) {
            throw new Error(
              `Your shipping calculate API ${shippingMethod.calculate_api} is invalid`
            );
          }
          const response = await axios.get(api);
          if (response.status < 400) {
            return toPrice(response.data.data.cost);
          } else {
            this.setError('shipping_fee_excl_tax', response.data.message);
            return 0;
          }
        } else if (shippingMethod.weight_based_cost) {
          const totalWeight = this.getData('total_weight');
          const weightBasedCost: { min_weight: number; cost: number }[] =
            shippingMethod.weight_based_cost
              .map(({ min_weight, cost }: { min_weight: string; cost: string }) => ({
                min_weight: parseFloat(min_weight),
                cost: toPrice(cost)
              }))
              .sort((a: any, b: any) => a.min_weight - b.min_weight);
          let cost = 0;
          for (const tier of weightBasedCost) {
            if (totalWeight >= tier.min_weight) cost = tier.cost;
          }
          return toPrice(cost);
        } else if (shippingMethod.price_based_cost) {
          const subTotal = this.getData('sub_total');
          const priceBasedCost: { min_price: number; cost: number }[] =
            shippingMethod.price_based_cost
              .map(({ min_price, cost }: { min_price: string; cost: string }) => ({
                min_price: toPrice(min_price),
                cost: toPrice(cost)
              }))
              .sort((a: any, b: any) => a.min_price - b.min_price);
          let cost = 0;
          for (const tier of priceBasedCost) {
            if (subTotal >= tier.min_price) cost = tier.cost;
          }
          return toPrice(cost);
        } else {
          this.setError('shipping_fee_excl_tax', 'Could not calculate shipping fee');
          return 0;
        }
      }
    ],
    dependencies: ['shipping_method']
  },
  {
    key: 'shipping_fee_tax_percent',
    resolvers: [
      async function(this: CartContext) {
        if (!this.getData('shipping_method')) {
          return null;
        }
        let shippingTaxClass: string | number = await getSetting(
          'defaultShippingTaxClassId',
          ''
        );
        if (shippingTaxClass === '') {
          return 0;
        }
        shippingTaxClass = parseInt(shippingTaxClass as string, 10);
        if (shippingTaxClass > 0) {
          const taxClass = await select()
            .from('tax_class')
            .where('tax_class_id', '=', shippingTaxClass)
            .load(pool);
          if (!taxClass) {
            return 0;
          }
          const shippingAddress = this.getData('shippingAddress');
          return getTaxPercent(
            await getTaxRates(
              shippingTaxClass,
              shippingAddress.country,
              shippingAddress.province,
              shippingAddress.postcode
            )
          );
        } else {
          const items = this.getItems();
          let percentage = 0;
          if (shippingTaxClass === 0) {
            items.forEach((item) => {
              if (item.getData('tax_percent') > percentage) {
                percentage = item.getData('tax_percent');
              }
            });
          } else {
            items.forEach((item) => {
              const itemTotal = item.getData('final_price') * item.getData('qty');
              percentage +=
                (itemTotal / this.getData('sub_total')) * item.getData('tax_percent');
            });
          }
          return percentage;
        }
      }
    ],
    dependencies: ['sub_total', 'shipping_method']
  },
  {
    key: 'shipping_tax_amount',
    resolvers: [
      async function(this: CartContext) {
        const priceIncludingTax = getConfig('pricing.tax.price_including_tax', false);
        if (this.getData('shipping_fee_draft') === 0) {
          return 0;
        }
        return toPrice(
          calculateTaxAmount(
            this.getData('shipping_fee_tax_percent'),
            this.getData('shipping_fee_draft'),
            1,
            priceIncludingTax
          )
        );
      }
    ],
    dependencies: ['shipping_fee_draft', 'shipping_fee_tax_percent']
  },
  {
    key: 'shipping_fee_excl_tax',
    resolvers: [
      async function(this: CartContext) {
        const priceIncludingTax = getConfig('pricing.tax.price_including_tax', false);
        if (this.getData('shipping_fee_draft') === 0) {
          return 0;
        }
        if (!priceIncludingTax) {
          return this.getData('shipping_fee_draft');
        }
        return toPrice(
          this.getData('shipping_fee_draft') -
            calculateTaxAmount(
              this.getData('shipping_fee_tax_percent'),
              this.getData('shipping_fee_draft'),
              1,
              priceIncludingTax
            )
        );
      }
    ],
    dependencies: ['shipping_fee_tax_percent', 'shipping_fee_draft']
  },
  {
    key: 'shipping_fee_incl_tax',
    resolvers: [
      async function(this: CartContext) {
        const priceIncludingTax = getConfig('pricing.tax.price_including_tax', false);
        if (this.getData('shipping_fee_draft') === 0) {
          return 0;
        }
        if (priceIncludingTax === true) {
          return this.getData('shipping_fee_draft');
        }
        return toPrice(
          this.getData('shipping_fee_excl_tax') + this.getData('shipping_tax_amount')
        );
      }
    ],
    dependencies: ['shipping_fee_excl_tax', 'shipping_tax_amount', 'shipping_fee_draft']
  },
  {
    key: 'shipping_note',
    resolvers: [
      async function(value?: any) {
        return value;
      }
    ]
  }
];
