import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';

export default async function registerDefaultRegistrationCollectionFilters(this: any) {
  const { isAdmin } = this;
  const defaultFilters = [
    {
      key: 'keyword',
      operation: ['eq'],
      callback: (query: any, operation: string, value: string, currentFilters: any[]) => {
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
      callback: (query: any, operation: string, value: string, currentFilters: any[]) => {
        query.andWhere(
          'participant.first_name',
          OPERATION_MAP[operation],
          `%${value}%`
        );
        currentFilters.push({
          key: 'name',
          operation,
          value
        });
      }
    },
    {
      key: 'product_uuid',
      operation: ['eq'],
      callback: (query: any, operation: string, value: string, currentFilters: any[]) => {
        query.andWhere('product.uuid', '=', value);
        currentFilters.push({ key: 'product_uuid', operation, value });
      }
    }
  ];

  return defaultFilters;
}
