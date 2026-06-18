import { getConfig } from '../../../../../../lib/util/getConfig.js';
import { calculateTaxAmount } from '../../../../../../modules/tax/services/calculateTaxAmount.js';

export const taxFields = [
  {
    key: 'tax_class_id',
    resolvers: [
      async function resolver() {
        const product = await this.getProduct();
        return product.tax_class ?? null;
      }
    ],
    dependencies: ['product_id']
  },
  {
    key: 'tax_amount_before_discount',
    resolvers: [
      async function resolver() {
        const catalogPriceInclTax = getConfig(
          'pricing.tax.price_including_tax',
          false
        );
        if (catalogPriceInclTax) {
          return calculateTaxAmount(
            this.getData('tax_percent'),
            this.getData('product_price_incl_tax'),
            this.getData('qty'),
            true
          );
        } else {
          return calculateTaxAmount(
            this.getData('tax_percent'),
            this.getData('product_price'),
            this.getData('qty')
          );
        }
      }
    ],
    dependencies: ['tax_percent', 'product_price', 'product_price_incl_tax', 'qty']
  },
  {
    key: 'tax_amount',
    resolvers: [
      async function resolver() {
        const priceIncludingTax = getConfig(
          'pricing.tax.price_including_tax',
          false
        );
        const discountAmount = this.getData('discount_amount');
        const discountAmountPerUnit = discountAmount / this.getData('qty');
        const finalPricePerUnit = priceIncludingTax
          ? this.getData('final_price_incl_tax') - discountAmountPerUnit
          : this.getData('final_price') - discountAmountPerUnit;
        return calculateTaxAmount(
          this.getData('tax_percent'),
          finalPricePerUnit,
          this.getData('qty'),
          priceIncludingTax
        );
      }
    ],
    dependencies: [
      'discount_amount',
      'tax_percent',
      'final_price',
      'final_price_incl_tax',
      'qty'
    ]
  }
];
