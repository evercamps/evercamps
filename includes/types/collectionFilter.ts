import { GraphQLFilter, GraphQLFilterOperation } from './graphqlFilter.js';

export interface CollectionFilter {
  key: string;
  operation: string[];
  callback: (
    query: any,
    operation: GraphQLFilterOperation,
    value: string,
    currentFilters: GraphQLFilter[]
  ) => void;
}
