import { select, update } from '@evershop/postgres-query-builder';
import { normalizeOptionPeriod, pool } from '../../core.js';
import { apiHandler } from '../../lib/apiHandler.js';

// POST /api/fiscal-attests/option-period  (admin)
// { optionId, startDate, endDate, dayCount }  - set the care period of an
// attribute option (e.g. kampweek "Week 1 zomer 2026") straight from the
// attests page. Same validation as the attribute edit page; every
// registration on that week gets the dates.
export default apiHandler(async (request) => {
  const { optionId, startDate, endDate, dayCount } = request.body || {};
  const option = await select('attribute_option_id', 'option_text')
    .from('attribute_option')
    .where('attribute_option_id', '=', Number(optionId))
    .load(pool);
  if (!option) {
    throw new Error('Option not found');
  }
  const period = normalizeOptionPeriod(
    { start_date: startDate, end_date: endDate, day_count: dayCount },
    option.option_text
  );
  await update('attribute_option')
    .given(period)
    .where('attribute_option_id', '=', option.attribute_option_id)
    .execute(pool);
  return period;
});
