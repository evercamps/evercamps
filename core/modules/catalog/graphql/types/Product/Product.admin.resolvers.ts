import { buildUrl } from '../../../../../lib/router/buildUrl.js';

interface Product {
  uuid: string;
}

export default {
  Product: {
    editUrl: (product: Product): string =>
      buildUrl('productEdit', { id: product.uuid }),

    updateApi: (product: Product): string =>
      buildUrl('updateProduct', { id: product.uuid }),

    deleteApi: (product: Product): string =>
      buildUrl('deleteProduct', { id: product.uuid })
  }
};