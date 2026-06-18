export const itemFields = [
  {
    key: 'items',
    resolvers: [
      async function resolver() {
        const triggeredField = this.getTriggeredField();
        const requestedValue = this.getRequestedValue();
        const items = [];
        if (triggeredField === 'items') {
          requestedValue.forEach((item) => {
            items.push(item);
          });
          return items;
        } else {
          return this.getData('items');
        }
      }
    ],
    dependencies: ['cart_id', 'currency']
  },
  {
    key: 'total_qty',
    resolvers: [
      async function resolver() {
        let count = 0;
        const items = this.getItems();
        items.forEach((i) => {
          count += parseInt(i.getData('qty'), 10);
        });
        return count;
      }
    ],
    dependencies: ['items']
  },
  {
    key: 'total_weight',
    resolvers: [
      async function resolver() {
        let weight = 0;
        const items = this.getItems();
        items.forEach((i) => {
          weight += i.getData('product_weight') * i.getData('qty');
        });
        return weight;
      }
    ],
    dependencies: ['items']
  }
];
