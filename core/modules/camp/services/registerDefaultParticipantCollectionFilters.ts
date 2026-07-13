import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';

export default async function registerDefaultParticipantCollectionFilters() {
  const defaultFilters = [
    {
      key: 'keyword',
      operation: ['eq'],
      callback: (query: any, operation: string, value: string, currentFilters: any[]) => {
        query
          .andWhere('participant.first_name', 'ILIKE', `%${value}%`)
          .or('participant.last_name', 'ILIKE', `%${value}%`);
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
    }
  ];

  return defaultFilters;
}
