import type { ItemContext, ItemField } from '../types.js';

// product_variant_id of a cart item: the explicitly chosen variant (validated
// against the product), otherwise the product's default variant. Null when the
// product only has real variants and none was chosen; sku/price/stock then fall
// back to the product (legacy behaviour, until the storefront variant picker
// exists - see core/.docs/variation-plan.md).
export const variantFields: ItemField[] = [
  {
    key: 'product_variant_id',
    resolvers: [
      async function(this: ItemContext, value?: number | string | null) {
        const requested =
          value === undefined || value === null || value === ''
            ? null
            : parseInt(String(value), 10);

        const variant = await this.getVariant(requested);
        if (requested !== null) {
          if (!variant || variant.product_id !== this.getData('product_id')) {
            this.setError('product_variant_id', 'This variant is not available for this product');
            return requested;
          }
        }
        // A disabled variant (e.g. a cancelled week) can't be booked; an item
        // already in the cart gets an error so checkout is blocked.
        if (variant && variant.status === false) {
          this.setError('product_variant_id', 'This variant is no longer available');
          return variant.product_variant_id;
        }
        this.setError('product_variant_id', undefined);
        return variant ? variant.product_variant_id : null;
      }
    ],
    dependencies: ['product_id']
  }
];
