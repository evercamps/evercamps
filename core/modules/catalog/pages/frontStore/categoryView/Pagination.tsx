import { Pagination } from '@components/frontStore/catalog/product/list/Pagination';
import React from 'react';

interface Filter {
  key: string;
  operation: string;
  value: string;
}

interface PaginationWrapperProps {
  products: {
    showProducts: number;
    products: {
      total: number;
      currentFilters: Filter[];
    };
  };
}

export default function PaginationWrapper({
  products: {
    showProducts,
    products: { total, currentFilters }
  }
}: PaginationWrapperProps): React.ReactElement | null {
  if (!showProducts) {
    return null;
  }

  const page = currentFilters.find((filter) => filter.key === 'page');
  const limit = currentFilters.find((filter) => filter.key === 'limit');

  return (
    <Pagination
      total={total}
      limit={parseInt(limit?.value || '1', 10)}
      currentPage={parseInt(page?.value || '1', 10)}
    />
  );
}

export const layout = {
  areaId: 'rightColumn',
  sortOrder: 30
};

export const query = `
  query Query($filters: [FilterInput]) {
    products: category(id: getContextValue('categoryId')) {
      showProducts
      products(filters: $filters) {
        total
        currentFilters {
          key
          operation
          value
        }
      }
    }
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;