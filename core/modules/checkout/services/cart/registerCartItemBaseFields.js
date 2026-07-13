import { campsFields } from './fields/cartItem/camps.js';
import { identityFields } from './fields/cartItem/identity.js';
import { inventoryFields } from './fields/cartItem/inventory.js';
import { linkFields } from './fields/cartItem/links.js';
import { pricingFields } from './fields/cartItem/pricing.js';
import { productFields } from './fields/cartItem/product.js';
import { taxFields } from './fields/cartItem/tax.js';

export function registerCartItemBaseFields(fields) {
  return fields.concat([
    ...identityFields,
    ...productFields,
    ...pricingFields,
    ...taxFields,
    ...inventoryFields,
    ...linkFields,
    ...campsFields
  ]);
}
