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
        this.setError('product_variant_id', undefined);
        return variant ? variant.product_variant_id : null;
      }
    ],
    dependencies: ['product_id']
  }
];
