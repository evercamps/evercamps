import { getAvailablePaymentMethods } from '../../../getAvailablePaymentMethos.js';
import type { CartContext, CartField } from '../types.js';

export const paymentFields: CartField[] = [
  {
    key: 'payment_method',
    resolvers: [
      async function(this: CartContext, value?: any) {
        const paymentMethod: string | null = value;
        const methods = await getAvailablePaymentMethods();
        const methodCodes = methods.map((m: any) => m.methodCode);
        if (paymentMethod && methodCodes.includes(paymentMethod)) {
          this.setError('payment_method', undefined);
          return paymentMethod;
        } else if (paymentMethod && !methodCodes.includes(paymentMethod)) {
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
      async function(value?: any) {
        // TODO: This field should be handled by each payment method
        return value;
      }
    ],
    dependencies: ['payment_method']
  }
];
