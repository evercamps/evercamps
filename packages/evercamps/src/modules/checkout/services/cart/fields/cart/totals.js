import { toPrice } from '../../../toPrice.js';

export const totalsFields = [
  {
    key: 'sub_total',
    resolvers: [
      async function resolver() {
        let total = 0;
        const items = this.getItems();
        items.forEach((i) => {
          total += i.getData('line_total');
        });
        return toPrice(total);
      }
    ],
    dependencies: ['items']
  },
  {
    key: 'sub_total_incl_tax',
    resolvers: [
      async function resolver() {
        let total = 0;
        const items = this.getItems();
        items.forEach((i) => {
          total += i.getData('line_total_incl_tax');
        });
        return toPrice(total);
      }
    ],
    dependencies: ['items']
  }
];
