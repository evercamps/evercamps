import { getConfig } from '../../../../../../lib/util/getConfig.js';
import { calculateTaxAmount } from '../../../../../../modules/tax/services/calculateTaxAmount.js';
import { toPrice } from '../../../toPrice.js';
import type { ItemContext, ItemField } from '../types.js';

// Catalog price of the item: the variant's price when the item has a variant
// (the default variant mirrors the product price), otherwise the product's.
async function catalogPrice(item: ItemContext): Promise<number> {
  const variant = await item.getVariant();
  if (variant) {
    return parseFloat(variant.price);
  }
  return parseFloat((await item.getProduct()).price);
}

export const pricingFields: ItemField[] = [
  {
    key: 'product_price',
    resolvers: [
      async function(this: ItemContext) {
        const price = await catalogPrice(this);
        const catalogPriceInclTax = getConfig('pricing.tax.price_including_tax', false);
        if (catalogPriceInclTax) {
          const taxAmount = calculateTaxAmount(
            this.getData('tax_percent'),
            price,
            1,
            true
          );
          return toPrice(price - taxAmount);
        }
        return toPrice(price);
      }
    ],
    dependencies: ['product_id', 'product_variant_id', 'tax_percent']
  },
  {
    key: 'product_price_incl_tax',
    resolvers: [
      async function(this: ItemContext) {
        const catalogPriceInclTax = getConfig('pricing.tax.price_including_tax', false);
        if (catalogPriceInclTax) {
          return toPrice(await catalogPrice(this));
        }
        const taxAmount = calculateTaxAmount(
          this.getData('tax_percent'),
          this.getData('product_price'),
          1
        );
        return toPrice(this.getData('product_price') + taxAmount);
      }
    ],
    dependencies: ['product_variant_id', 'product_price', 'tax_percent']
  },
  {
    key: 'final_price',
    resolvers: [
      async function(this: ItemContext) {
        return this.getData('product_price'); // TODO This price should include the custom option price
      }
    ],
    dependencies: ['product_price']
  },
  {
    key: 'final_price_incl_tax',
    resolvers: [
      async function(this: ItemContext) {
        return this.getData('product_price_incl_tax');
      }
    ],
    dependencies: ['product_price_incl_tax']
  },
  {
    key: 'line_total',
    resolvers: [
      async function(this: ItemContext) {
        return this.getData('final_price') * this.getData('qty');
      }
    ],
    dependencies: ['final_price', 'qty']
  },
  {
    key: 'line_total_incl_tax',
    resolvers: [
      async function(this: ItemContext) {
        return this.getData('final_price_incl_tax') * this.getData('qty');
      }
    ],
    dependencies: ['final_price_incl_tax', 'qty']
  }
];
