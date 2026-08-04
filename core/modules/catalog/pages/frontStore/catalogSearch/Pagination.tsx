import { Pagination } from '@components/frontStore/catalog/product/list/Pagination';
import React from 'react';

interface Filter {
  key: string;
  operation: string;
  value: string;
}

interface PaginationWrapperProps {
  products: {
    total: number;
    currentFilters: Filter[];
  };
}

export default function PaginationWrapper({
  products: { total, currentFilters }
}: PaginationWrapperProps): React.ReactElement {
  const page = currentFilters.find((filter) => filter.key === 'page');
  const limit = currentFilters.find((filter) => filter.key === 'limit');

  return (
    <Pagination
      total={total}
      limit={parseInt(limit?.value ?? '20', 10)}
      currentPage={parseInt(page?.value ?? '1', 10)}
    />
  );
}

export const layout = {
  areaId: 'oneColumn',
  sortOrder: 30
};

export const query = `
  query Query($filtersFromUrl: [FilterInput]) {
    products(filters: $filtersFromUrl) {
      total
      currentFilters {
        key
        operation
        value
      }
    }
  }
`;

export const variables = `{
  filtersFromUrl: getContextValue("filtersFromUrl")
}`;