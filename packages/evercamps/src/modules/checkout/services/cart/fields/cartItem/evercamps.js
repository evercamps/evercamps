export const evercampsFields = [
  {
    key: 'registrations',
    resolvers: [
      async function resolver() {
        return this.getTriggeredField() === 'registrations'
          ? this.getRequestedValue()
          : this.getData('registrations') ?? null;
      }
    ]
  },
  {
    key: 'manageRegistrations',
    resolvers: [
      async function resolver(value) {
        return value ?? null;
      }
    ]
  }
];
