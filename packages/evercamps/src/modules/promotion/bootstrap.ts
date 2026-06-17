import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../lib/postgres/connection.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerCartItemPromotionFields } from './services/registerCartItemPromotionFields.js';
import { registerCartPromotionFields } from './services/registerCartPromotionFields.js';
import { registerDefaultCalculators } from './services/registerDefaultCalculators.js';
import { registerDefaultCouponCollectionFilters } from './services/registerDefaultCouponCollectionFilters.js';
import { registerDefaultValidators } from './services/registerDefaultValidators.js';

export default (): void => {
  addProcessor(
    'couponLoaderFunction',
    () => {
      return async (couponCode: any) => {
        const coupon = await select()
          .from('coupon')
          .where('coupon', '=', couponCode)
          .load(pool);

        return coupon;
      };
    },
    0
  );

  addProcessor('cartFields', registerCartPromotionFields, 0);

  addProcessor('cartItemFields', registerCartItemPromotionFields, 11);

  addProcessor('couponValidatorFunctions', registerDefaultValidators);

  addProcessor('discountCalculatorFunctions', registerDefaultCalculators);

  addProcessor(
    'couponCollectionFilters',
    registerDefaultCouponCollectionFilters,
    1
  );

  addProcessor(
    'couponCollectionFilters',
    (filters: any[]) => [...filters, ...defaultPaginationFilters],
    2
  );
};