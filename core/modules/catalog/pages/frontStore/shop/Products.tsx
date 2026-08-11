import ProductList from '@components/frontStore/catalog/product/list/List';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface ProductPrice {
  regular: {
    value: number;
    text: string;
  };
  special: {
    value: number;
    text: string;
  };
}

interface ProductImage {
  alt: string;
  listing: string;
}

interface ProductItem {
  productId: number;
  name: string;
  sku: string;
  url: string;
  price: ProductPrice;
  image: ProductImage;
}

interface ProductsProps {
  products?: {
    items: ProductItem[];
  };
}

export default function Products({
  products: { items } = { items: [] }
}: ProductsProps): React.ReactElement {
  return (
    <div>
      <ProductList products={items} countPerRow={4} />
      <span className="product-count italic block mt-8">
        {_('${count} products', { count: items.length })}
      </span>
    </div>
  );
}

export const layout = {
  areaId: 'rightColumn',
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
