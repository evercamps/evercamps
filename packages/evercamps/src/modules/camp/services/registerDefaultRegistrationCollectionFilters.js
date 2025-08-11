import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';

export default async function registerDefaultRegistrationCollectionFilters() {
  const { isAdmin } = this;
  // List of default supported filters
  const defaultFilters = [
    {
      key: 'keyword',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query
          .andWhere('product_description.name', 'ILIKE', `%${value}%`);
        currentFilters.push({
          key: 'keyword',
          operation,
          value
        });
      }
    },
    {
      key: 'name',
      operation: ['like'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'registration.first_name',
          OPERATION_MAP[operation],
          `%${value}%`
        );
        currentFilters.push({
          key: 'name',
          operation,
          value
        });
      }
    }
  ];

  return defaultFilters;
}
