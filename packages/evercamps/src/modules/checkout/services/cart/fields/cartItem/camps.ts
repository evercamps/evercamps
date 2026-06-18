import type { ItemContext, ItemField } from '../types.js';

export const campsFields: ItemField[] = [
  {
    key: 'registrations',
    resolvers: [
      async function(this: ItemContext) {
        return this.getTriggeredField() === 'registrations'
          ? this.getRequestedValue()
          : this.getData('registrations') ?? null;
      }
    ]
  },
  {
    key: 'manageRegistrations',
    resolvers: [
      async function(value?: any) {
        return value ?? null;
      }
    ]
  }
];
