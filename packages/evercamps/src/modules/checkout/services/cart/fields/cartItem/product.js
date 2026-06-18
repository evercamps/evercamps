export const productFields = [
  {
    key: 'product_id',
    resolvers: [
      async function resolver() {
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
      async function resolver() {
        const product = await this.getProduct();
        return product.uuid;
      }
    ]
  },
  {
    key: 'product_sku',
    resolvers: [
      async function resolver() {
        const product = await this.getProduct();
        return product.sku;
      }
    ]
  },
  {
    key: 'group_id',
    resolvers: [
      async function resolver() {
        const product = await this.getProduct();
        return parseInt(product.group_id, 10) ?? null;
      }
    ],
    dependencies: ['product_id']
  },
  {
    key: 'category_id',
    resolvers: [
      async function resolver() {
        const product = await this.getProduct();
        return product.category_id ? parseInt(product.category_id, 10) : null;
      }
    ],
    dependencies: ['product_id']
  },
  {
    key: 'product_name',
    resolvers: [
      async function resolver() {
        const product = await this.getProduct();
        return product.name ?? null;
      }
    ],
    dependencies: ['product_id']
  },
  {
    key: 'thumbnail',
    resolvers: [
      async function resolver() {
        const product = await this.getProduct();
        return product.thumb_image ?? null;
      }
    ],
    dependencies: ['product_id']
  },
  {
    key: 'product_weight',
    resolvers: [
      async function resolver() {
        const product = await this.getProduct();
        return parseFloat(product.weight) ?? null;
      }
    ],
    dependencies: ['product_id']
  },
  {
    key: 'variant_group_id',
    resolvers: [
      async function resolver() {
        const product = await this.getProduct();
        return product.variant_group_id ?? null;
      }
    ],
    dependencies: ['product_id']
  }
];
