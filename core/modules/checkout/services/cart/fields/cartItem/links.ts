import { buildUrl } from '../../../../../../lib/router/buildUrl.js';
import type { ItemContext, ItemField } from '../types.js';

export const linkFields: ItemField[] = [
  {
    key: 'removeUrl',
    resolvers: [
      async function(this: ItemContext) {
        if (this.getData('cart_item_id')) {
          return buildUrl('removeMineCartItem', { item_id: this.getData('uuid') });
        }
        return undefined;
      }
    ],
    dependencies: ['cart_item_id', 'uuid']
  }
];
