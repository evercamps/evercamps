import React, { useMemo, useState } from 'react';
import Area from '@components/common/Area';
import { useAppDispatch } from '@components/common/context/app';
import './Filter.scss';
import { AttributeFilter } from '@components/frontStore/catalog/categoryView/filter/AttributeFilter';
import { CategoryFilter } from '@components/frontStore/catalog/categoryView/filter/CategoryFilter';
import { PriceFilter } from '@components/frontStore/catalog/categoryView/filter/PriceFilter';
import { _ } from '../../../../../lib/locale/translate/_.js';

export const FilterDispatch = React.createContext<{ updateFilter: (newFilters: FilterItem[]) => Promise<void> } | undefined>(undefined);

interface FilterItem {
  key: string;
  operation: string;
  value: string;
}

interface AttributeOption {
  optionId: number;
  optionText: string;
}

interface AvailableAttribute {
  attributeCode: string;
  attributeName: string;
  options: AttributeOption[];
}

interface CategoryChild {
  categoryId: number;
  name: string;
  uuid: string;
}

interface PriceRange {
  min: number;
  max: number;
}

interface FilterProps {
  category: {
    products: {
      currentFilters: FilterItem[];
    };
    availableAttributes: AvailableAttribute[];
    priceRange: PriceRange;
    children: CategoryChild[];
  };
  setting: {
    storeLanguage: string;
    storeCurrency: string;
  };
}

export default function Filter({
  category: {
    products: { currentFilters },
    availableAttributes,
    priceRange,
    children
  },
  setting
}: FilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const AppContextDispatch = useAppDispatch();

  const updateFilter = async (newFilters: FilterItem[]) => {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl, window.location.origin);
    for (let i = 0; i < currentFilters.length; i += 1) {
      if (
        currentFilters[i].key === 'page' ||
        currentFilters[i].key === 'limit' ||
        currentFilters[i].key === 'ob' ||
        currentFilters[i].key === 'od'
      ) {
        continue;
      }
      if (currentFilters[i].operation === 'eq') {
        url.searchParams.delete(currentFilters[i].key);
      } else {
        url.searchParams.delete(`${currentFilters[i].key}[operation]`);
        url.searchParams.delete(`${currentFilters[i].key}[value]`);
      }
    }

    for (let i = 0; i < newFilters.length; i += 1) {
      if (
        newFilters[i].key === 'page' ||
        newFilters[i].key === 'limit' ||
        newFilters[i].key === 'ob' ||
        newFilters[i].key === 'od'
      ) {
        continue;
      }
      if (newFilters[i].operation === 'eq') {
        url.searchParams.append(newFilters[i].key, newFilters[i].value);
      } else {
        url.searchParams.append(
          `${newFilters[i].key}[operation]`,
          newFilters[i].operation
        );
        url.searchParams.append(
          `${newFilters[i].key}[value]`,
          newFilters[i].value
        );
      }
    }

    url.searchParams.delete('ajax');
    url.searchParams.delete('page');
    url.searchParams.append('ajax', 'true');
    await AppContextDispatch?.fetchPageData(url);
    url.searchParams.delete('ajax');

    history.pushState(null, '', url);
  };

  const contextValue = useMemo(() => ({ updateFilter }), [currentFilters]);

  return (
    <FilterDispatch value={contextValue}>
      <div
        className={`product-filter-tool hidden md:block ${
          isOpen ? 'opening' : 'closed'
        }`}
      >
        <div className="filter-heading">
          <span className="font-bold ">{_('SHOP BY')}</span>
        </div>
        <Area
          id="productFilter"
          noOuter
          availableAttributes={availableAttributes}
          priceRange={priceRange}
          currentFilters={currentFilters}
          coreComponents={[
            {
              component: { default: PriceFilter },
              props: { priceRange, currentFilters, updateFilter, setting },
              sortOrder: 10
            },
            {
              component: { default: CategoryFilter },
              props: {
                currentFilters,
                updateFilter,
                setting,
                categories: children
              },
              sortOrder: 15
            },
            {
              component: { default: AttributeFilter },
              props: { availableAttributes, currentFilters, updateFilter },
              sortOrder: 20
            }
          ]}
        />
        <a
          className="filter-closer flex md:hidden"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setIsOpen(!isOpen);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
            />
          </svg>
        </a>
      </div>
      <a
        className="filter-opener flex md:hidden"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
          />
        </svg>
      </a>
    </FilterDispatch>
  );
}

export const layout = {
  areaId: 'leftColumn',
  sortOrder: 1
};

export const query = `
query Query($filters: [FilterInput]) {
  category (id: getContextValue('categoryId')) {
    products (filters: $filters) {
      currentFilters {
        key
        operation
        value
      }
    }
    availableAttributes {
      attributeCode
      attributeName
      options {
        optionId
        optionText
      }
    }
    priceRange {
      min
      max
    }
    children {
      categoryId,
      name
      uuid
    }
  }
  setting {
    storeLanguage
    storeCurrency
  }
}`;

export const useFilterDispatch = () => React.useContext(FilterDispatch);
export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;
