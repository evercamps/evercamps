import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { getValue } from '../../../lib/util/registry.js';

export class ParticipantCollection {
  private baseQuery: any;
  private totalQuery: any;
  currentFilters: any[];

  constructor(baseQuery: any) {
    this.baseQuery = baseQuery;
    this.currentFilters = [];
    this.baseQuery.orderBy('participant.participant_id', 'DESC');
  }

  async init(filters: any[] = []) {
    const currentFilters: any[] = [];

    const participantCollectionFilters = await getValue(
      'participantCollectionFilters',
      []
    );

    participantCollectionFilters.forEach((filter: any) => {
      const check = filters.find(
        (f) => f.key === filter.key && filter.operation.includes(f.operation)
      );
      if (filter.key === '*' || check) {
        filter.callback(
          this.baseQuery,
          check?.operation,
          check?.value,
          currentFilters
        );
      }
    });

    const totalQuery = this.baseQuery.clone();
    totalQuery.select('COUNT(participant.participant_id)', 'total');
    totalQuery.removeOrderBy();
    totalQuery.removeLimit();

    this.currentFilters = currentFilters;
    this.totalQuery = totalQuery;
  }

  async items() {
    const items = await this.baseQuery.execute(pool);
    return items.map((row: any) => camelCase(row));
  }

  async total() {
    const total = await this.totalQuery.execute(pool);
    return total[0].total;
  }
}
