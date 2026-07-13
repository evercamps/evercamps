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
    key: 'product_sku',
    resolvers: [
      async function(this: ItemContext) {
        return (await this.getProduct()).sku;
      }
    ]
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
