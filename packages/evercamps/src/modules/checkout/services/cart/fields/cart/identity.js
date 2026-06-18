import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../../../../../../lib/util/getConfig.js';

export const identityFields = [
  {
    key: 'cart_id',
    resolvers: [
      async function resolver() {
        return this.getData('cart_id');
      }
    ]
  },
  {
    key: 'uuid',
    resolvers: [
      function resolver() {
        const uuid = this.getData('uuid');
        const key = uuidv4();
        return uuid || key.replace(/-/g, '');
      }
    ],
    dependencies: ['cart_id']
  },
  {
    key: 'currency',
    resolvers: [
      async function resolver() {
        return getConfig('shop.currency', 'USD');
      }
    ]
  },
  {
    key: 'user_ip',
    resolvers: [
      async function resolver(ip) {
        return ip;
      }
    ]
  },
  {
    key: 'sid',
    resolvers: [
      async function resolver(sid) {
        return sid;
      }
    ]
  },
  {
    key: 'status',
    resolvers: [
      async function resolver() {
        return 1;
      }
    ]
  }
];
