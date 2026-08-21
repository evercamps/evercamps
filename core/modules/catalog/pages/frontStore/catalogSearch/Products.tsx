import ProductList from '@components/frontStore/catalog/product/list/List';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface ProductPrice {
  value?: number;
  text?: string;
}

interface Product {
  name?: string;
  productId?: number;
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
    items?: Product[];
  };
}

export default function Products({
  products = { items: [] }
}: ProductsProps): React.ReactElement {
  const items = products.items ?? [];

  return (
    <div>
      <ProductList products={items} countPerRow={4} />
      <span className="product-count italic block mt-8">
        {_('${count} products', { count: items.length.toString() })}
      </span>
    </div>
  );
}

export const layout = {
  areaId: 'oneColumn',
  sortOrder: 25
};

export const query = `
  query Query($filtersFromUrl: [FilterInput]) {
    products(filters: $filtersFromUrl) {
      items {
        ...Product
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

export const variables = `{
  filtersFromUrl: getContextValue("filtersFromUrl")
}`;