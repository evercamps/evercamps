import { billingFields } from './fields/cart/billing.js';
import { identityFields } from './fields/cart/identity.js';
import { itemFields } from './fields/cart/items.js';
import { paymentFields } from './fields/cart/payment.js';
import { shippingFields } from './fields/cart/shipping.js';
import { taxFields } from './fields/cart/tax.js';
import { totalsFields } from './fields/cart/totals.js';

export function registerCartBaseFields(fields) {
  return fields.concat([
    ...identityFields,
    ...itemFields,
    ...totalsFields,
    ...taxFields,
    ...shippingFields,
    ...billingFields,
    ...paymentFields
  ]);
}
