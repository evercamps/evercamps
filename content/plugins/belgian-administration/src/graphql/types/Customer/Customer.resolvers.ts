import { buildUrl } from '../../../core.js';
import { listChildYearSplits } from '../../../services/fiscalAttest/payers.js';

interface CustomerRow {
  customerId?: number;
  nationalNumber?: string | null;
}

interface Context {
  user?: unknown;
  customer?: { customer_id?: number; customerId?: number } | null;
}

// Only the customer themself (storefront page) or an admin user.
function isOwnerOrAdmin(customer: CustomerRow, context: Context): boolean {
  const current = context?.customer?.customer_id ?? context?.customer?.customerId;
  return !!context?.user || (!!current && Number(current) === Number(customer.customerId));
}

export default {
  Customer: {
    nationalNumber: (customer: CustomerRow, _: unknown, context: Context) =>
      isOwnerOrAdmin(customer, context) ? customer.nationalNumber ?? null : null,
    saveFiscalDataApi: () => buildUrl('saveFiscalData'),
    fiscalAttestSplits: (customer: CustomerRow, _: unknown, context: Context) =>
      isOwnerOrAdmin(customer, context) && customer.customerId
        ? listChildYearSplits(customer.customerId)
        : [],
    saveFiscalAttestPayersApi: () => buildUrl('saveFiscalAttestPayers')
  }
};
