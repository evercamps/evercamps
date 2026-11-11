import { campsFields } from './fields/cartItem/camps.js';
import { identityFields } from './fields/cartItem/identity.js';
import { inventoryFields } from './fields/cartItem/inventory.js';
import { linkFields } from './fields/cartItem/links.js';
import { pricingFields } from './fields/cartItem/pricing.js';
import { productFields } from './fields/cartItem/product.js';
import { taxFields } from './fields/cartItem/tax.js';
import { variantFields } from './fields/cartItem/variant.js';

export function registerCartItemBaseFields(fields) {
  return fields.concat([
    ...identityFields,
    ...productFields,
    ...variantFields,
    ...pricingFields,
    ...taxFields,
    ...inventoryFields,
    ...linkFields,
    ...campsFields
  ]);
}
