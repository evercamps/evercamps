import { getConfig } from '../../../../../../lib/util/getConfig.js';
import { calculateTaxAmount } from '../../../../../../modules/tax/services/calculateTaxAmount.js';
import { toPrice } from '../../../toPrice.js';

export const pricingFields = [
  {
    key: 'product_price',
    resolvers: [
      async function resolver() {
        const product = await this.getProduct();
        const catalogPriceInclTax = getConfig(
          'pricing.tax.price_including_tax',
          false
        );
        if (catalogPriceInclTax) {
          const taxAmount = calculateTaxAmount(
            this.getData('tax_percent'),
            product.price,
            1,
            true
          );
          return toPrice(product.price - taxAmount);
        } else {
          return toPrice(product.price);
        }
      }
    ],
    dependencies: ['product_id', 'tax_percent']
  },
  {
    key: 'product_price_incl_tax',
    resolvers: [
      async function resolver() {
        const product = await this.getProduct();
        const catalogPriceInclTax = getConfig(
          'pricing.tax.price_including_tax',
          false
        );
        if (catalogPriceInclTax) {
          return toPrice(product.price);
        } else {
          const taxAmount = calculateTaxAmount(
            this.getData('tax_percent'),
            this.getData('product_price'),
            1
          );
          return toPrice(this.getData('product_price') + taxAmount);
        }
      }
    ],
    dependencies: ['product_price', 'tax_percent']
  },
  {
    key: 'final_price',
    resolvers: [
      async function resolver() {
        return this.getData('product_price'); // TODO This price should include the custom option price
      }
    ],
    dependencies: ['product_price']
  },
  {
    key: 'final_price_incl_tax',
    resolvers: [
      async function resolver() {
        return this.getData('product_price_incl_tax');
      }
    ],
    dependencies: ['product_price_incl_tax']
  },
  {
    key: 'line_total',
    resolvers: [
      async function resolver() {
        return this.getData('final_price') * this.getData('qty');
      }
    ],
    dependencies: ['final_price', 'qty']
  },
  {
    key: 'line_total_incl_tax',
    resolvers: [
      async function resolver() {
        return this.getData('final_price_incl_tax') * this.getData('qty');
      }
    ],
    dependencies: ['final_price_incl_tax', 'qty']
  }
];
