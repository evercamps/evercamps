import { buildUrl } from '../../../../../../lib/router/buildUrl.js';

export const linkFields = [
  {
    key: 'removeUrl',
    resolvers: [
      async function resolver() {
        if (this.getData('cart_item_id')) {
          return buildUrl('removeMineCartItem', {
            item_id: this.getData('uuid')
          });
        } else {
          return undefined;
        }
      }
    ],
    dependencies: ['cart_item_id', 'uuid']
  }
];
