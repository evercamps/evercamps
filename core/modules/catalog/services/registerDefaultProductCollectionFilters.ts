import {
  SelectQuery,
  value
} from '@evershop/postgres-query-builder';
import uniqid from 'uniqid';
import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';

interface CurrentFilter {
  key: string;
  operation: string;
  value: string;
}

interface FilterableAttribute {
  attribute_id: number;
  attribute_code: string;
}

interface ProductCollectionFilter {
  key: string;
  operation: string[];
  callback: (
    query: SelectQuery,
    operation: string,
    value: string,
    currentFilters: CurrentFilter[]
  ) => void;
}

type SortFunction = (
  query: SelectQuery,
  operation: string
) => SelectQuery;

export default async function registerDefaultProductCollectionFilters(
  this: {
    filterableAttributes: FilterableAttribute[];
    isAdmin: boolean;
  }
): Promise<ProductCollectionFilter[]> {
  const { filterableAttributes, isAdmin } = this;

  // List of default supported filters
  const defaultFilters: ProductCollectionFilter[] = [
    {
      key: 'keyword',
      operation: ['eq'],
      callback: (query, operation, filterValue, currentFilters) => {
        const where = query.getWhere();
        const bindingKey = `keyword_${uniqid()}`;

        where.addRaw(
          'AND',
          `to_tsvector('simple', product_description.name || ' ' || product_description.description) @@ websearch_to_tsquery('simple', :${bindingKey})`,
          {
            [bindingKey]: filterValue
          }
        );

        currentFilters.push({
          key: 'keyword',
          operation,
          value: filterValue
        });
      }
    },
    {
      key: 'min_price',
      operation: ['eq'],
      callback: (query, operation, filterValue, currentFilters) => {
        const price = parseFloat(filterValue);

        if (!Number.isNaN(price) && price > 0) {
          query.andWhere(
            'product.price',
            '>=',
            price
          );

          currentFilters.push({
            key: 'min_price',
            operation,
            value: filterValue
          });
        }
      }
    },
    {
      key: 'max_price',
      operation: ['eq'],
      callback: (query, operation, filterValue, currentFilters) => {
        const price = parseFloat(filterValue);

        if (!Number.isNaN(price) && price > 0) {
          query.andWhere(
            'product.price',
            '<=',
            price
          );

          currentFilters.push({
            key: 'max_price',
            operation,
            value: filterValue
          });
        }
      }
    },
    {
      key: 'name',
      operation: ['like'],
      callback: (query, operation, filterValue, currentFilters) => {
        query.andWhere(
          'product_description.name',
          OPERATION_MAP[operation],
          `%${filterValue}%`
        );

        currentFilters.push({
          key: 'name',
          operation,
          value: filterValue
        });
      }
    },
    {
      key: 'qty',
      operation: ['eq', 'gteq', 'lteq'],
      callback: (query, operation, filterValue, currentFilters) => {
        query.andWhere(
          'product_inventory.qty',
          OPERATION_MAP[operation],
          parseFloat(filterValue) || 0
        );

        currentFilters.push({
          key: 'qty',
          operation,
          value: filterValue
        });
      }
    },
    {
      key: 'sku',
      operation: ['like', 'in'],
      callback: (query, operation, filterValue, currentFilters) => {
        query.andWhere(
          'product.sku',
          OPERATION_MAP[operation],
          filterValue.split(',')
        );

        currentFilters.push({
          key: 'sku',
          operation,
          value: filterValue
        });
      }
    },
    {
      key: 'status',
      operation: ['eq'],
      callback: (query, operation, filterValue, currentFilters) => {
        query.andWhere(
          'product.status',
          OPERATION_MAP[operation],
          filterValue
        );

        currentFilters.push({
          key: 'status',
          operation,
          value: filterValue
        });
      }
    },
    {
      key: 'manage_registrations',
      operation: ['eq'],
      callback: (query, operation, filterValue, currentFilters) => {
        query.andWhere(
          'product.manage_registrations',
          OPERATION_MAP[operation],
          filterValue
        );

        currentFilters.push({
          key: 'manage_registrations',
          operation,
          value: filterValue
        });
      }
    },
    {
      key: 'type',
      operation: ['eq'],
      callback: (query, operation, filterValue, currentFilters) => {
        if (
          !['simple', 'configurable'].includes(filterValue)
        ) {
          return;
        }

        switch (filterValue) {
          case 'simple':
            query.andWhere(
              'product.variant_group_id',
              'IS NULL',
              null
            );
            break;

          case 'configurable':
            query.andWhere(
              'product.variant_group_id',
              'IS NOT NULL',
              null
            );
            break;
        }

        currentFilters.push({
          key: 'type',
          operation,
          value: filterValue
        });
      }
    },
    {
      key: 'cat',
      operation: ['eq', 'in', 'nin'],
      callback: (query, operation, filterValue, currentFilters) => {
        query.andWhere(
          'product.category_id',
          OPERATION_MAP[operation],
          ['in', 'nin'].includes(operation)
            ? filterValue.split(',')
            : filterValue
        );

        currentFilters.push({
          key: 'cat',
          operation,
          value: filterValue
        });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query, operation, filterValue, currentFilters) => {
        const productSortBy = getValueSync<
          Record<string, SortFunction>
        >(
          'productCollectionSortBy',
          {
            price: (query) =>
              query.orderBy('product.price'),

            name: (query) =>
              query.orderBy('product_description.name'),

            qty: (query) =>
              query.orderBy('product_inventory.qty'),

            status: (query) =>
              query.orderBy('product.status')
          },
          {
            isAdmin
          }
        );

        if (productSortBy[filterValue]) {
          productSortBy[filterValue](
            query,
            operation
          );

          currentFilters.push({
            key: 'ob',
            operation,
            value: filterValue
          });
        } else {
          query.orderBy(
            'product.product_id',
            'DESC'
          );
        }
      }
    }
  ];

  // Attribute filters
  filterableAttributes.forEach((attribute) => {
    defaultFilters.push({
      key: attribute.attribute_code,
      operation: ['in'],
      callback: (
        query,
        operation,
        filterValue,
        currentFilters
      ) => {
        const alias = `attribute_${uniqid()}`;

        // Split the value by comma and only get positive integers
        const values = filterValue
          .split(',')
          .map((v) => parseInt(v, 10))
          .filter((v) => v > 0);

        query
          .innerJoin(
            'product_attribute_value_index',
            alias
          )
          .on(
            `${alias}.product_id`,
            '=',
            'product.product_id'
          )
          .and(
            `${alias}.attribute_id`,
            '=',
            value(attribute.attribute_id)
          )
          .and(
            `${alias}.option_id`,
            'IN',
            value(values)
          );

        currentFilters.push({
          key: attribute.attribute_code,
          operation,
          value: filterValue
        });
      }
    });
  });

  return defaultFilters;
}