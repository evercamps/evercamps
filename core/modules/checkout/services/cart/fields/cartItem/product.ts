import type { ItemContext, ItemField } from '../types.js';

export const productFields: ItemField[] = [
  {
    key: 'product_id',
    resolvers: [
      async function(this: ItemContext) {
        const product = await this.getProduct();
        if (product.status === false) {
          this.setError('product_id', 'This product is not available');
        }
        return product.product_id;
      }
    ]
  },
  {
    key: 'product_uuid',
    resolvers: [
      async function(this: ItemContext) {
        return (await this.getProduct()).uuid;
      }
    ]
  },
  {
    // The variant's sku when there is one, so two weeks (variants) of the same
    // camp are separate cart lines. product_name stays the product's name; the
    // variant title is shown separately (OrderItem/Registration.variantTitle).
    key: 'product_sku',
    resolvers: [
      async function(this: ItemContext) {
        const variant = await this.getVariant();
        return variant?.sku ?? (await this.getProduct()).sku;
      }
    ],
    dependencies: ['product_id', 'product_variant_id']
  },
  {
    key: 'group_id',
    resolvers: [
      async function(this: ItemContext) {
        const product = await this.getProduct();
        return parseInt(product.group_id, 10) ?? null;
      }
    ],
    dependencies: ['product_id']
  },
  {
    key: 'category_id',
    resolvers: [
      async function(this: ItemContext) {
        const product = await this.getProduct();
        return product.category_id ? parseInt(product.category_id, 10) : null;
      }
    ],
    dependencies: ['product_id']
  },
  {
    key: 'product_name',
    resolvers: [
      async function(this: ItemContext) {
        return (await this.getProduct()).name ?? null;
      }
    ],
    dependencies: ['product_id']
  },
  {
    key: 'thumbnail',
    resolvers: [
      async function(this: ItemContext) {
        return (await this.getProduct()).thumb_image ?? null;
      }
    ],
    dependencies: ['product_id']
  },
  {
    key: 'product_weight',
    resolvers: [
      async function(this: ItemContext) {
        return parseFloat((await this.getProduct()).weight) ?? null;
      }
    ],
    dependencies: ['product_id']
  },
  {
    key: 'variant_group_id',
    resolvers: [
      async function(this: ItemContext) {
        return (await this.getProduct()).variant_group_id ?? null;
      }
    ],
    dependencies: ['product_id']
  }
];
