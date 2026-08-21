import ProductList from '@components/frontStore/catalog/product/list/List';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface ProductPrice {
  value: number;
  text: string;
}

interface Product {
  productId: number;
  name?: string;
  sku?: string;
  url?: string;
  price?: {
    regular?: ProductPrice;
    special?: ProductPrice;
  };
  image?: {
    alt?: string;
    listing?: string;
  };
}

interface ProductsProps {
  products?: {
    showProducts?: number;
    products?: {
      items?: Product[];
    };
  };
}

export default function Products({
  products = {
    showProducts: 1,
    products: {
      items: []
    }
  }
}: ProductsProps): React.ReactElement | null {
  const showProducts = products.showProducts;
  const items = products.products?.items ?? [];

  if (!showProducts) {
    return null;
  }

  return (
    <div>
      <ProductList products={items} countPerRow={3} />
      <span className="product-count italic block mt-8">
        {_('${count} products', { count: items.length.toString() })}
      </span>
    </div>
  );
}

export const layout = {
  areaId: 'rightColumn',
  sortOrder: 25
};

export const query = `
  query Query($filters: [FilterInput]) {
    products: category(id: getContextValue('categoryId')) {
      showProducts
      products(filters: $filters) {
        items {
          ...Product
        }
      }
    }
  }`;

export const fragments = `
  fragment Product on Product {
    productId
    name
    sku
    price {
      regular {
        value
        text
      }
      special {
        value
        text
      }
    }
    image {
      alt
      url: listing
    }
    url
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;