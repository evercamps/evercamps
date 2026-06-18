import { getAvailablePaymentMethods } from '../../../getAvailablePaymentMethos.js';

export const paymentFields = [
  {
    key: 'payment_method',
    resolvers: [
      async function resolver(paymentMethod) {
        const methods = await getAvailablePaymentMethods();
        if (
          paymentMethod &&
          methods.map((m) => m.methodCode).includes(paymentMethod)
        ) {
          this.setError('payment_method', undefined);
          return paymentMethod;
        } else if (
          paymentMethod &&
          !methods.map((m) => m.methodCode).includes(paymentMethod)
        ) {
          this.setError(
            'payment_method',
            `Payment method ${paymentMethod} is not available`
          );
          return null;
        } else if (paymentMethod === null) {
          this.setError('payment_method', 'Payment method is required');
          return null;
        }
      }
    ]
  },
  {
    key: 'payment_method_name',
    resolvers: [
      async function resolver(methodName) {
        // TODO: This field should be handled by each of payment method
        return methodName;
      }
    ],
    dependencies: ['payment_method']
  }
];
