import Area from '@components/Area';
import { Name } from '@components/frontStore/catalog/product/list/item/Name';
import { Price } from '@components/frontStore/catalog/product/list/item/Price';
import { Thumbnail } from '@components/frontStore/catalog/product/list/item/Thumbnail';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';
import { get } from '../../../../../lib/util/get.js';

interface ProductPrice {
  value?: number;
  text?: string;
}

interface Product {
  name?: string;
  sku?: string;
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

interface ProductListProps {
  products?: Product[];
  countPerRow?: number;
}

export default function ProductList({
  products = [],
  countPerRow = 3
}: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="product-list">
        <div className="text-center">{_('There is no product to display')}</div>
      </div>
    );
  }

  let className: string;

  switch (countPerRow) {
    case 3:
      className = 'grid grid-cols-2 md:grid-cols-3 gap-8';
      break;
    case 4:
      className = 'grid grid-cols-2 md:grid-cols-4 gap-8';
      break;
    case 5:
      className = 'grid grid-cols-2 md:grid-cols-5 gap-8';
      break;
    default:
      className = 'grid grid-cols-2 md:grid-cols-3 gap-8';
  }

  return (
    <div className={className}>
      {products.map((p) => (
        <Area
          id="productListingItem"
          className="listing-tem"
          product={p}
          key={p.productId}
          coreComponents={[
            {
              component: { default: Thumbnail },
              props: {
                url: p.url,
                imageUrl: get(p, 'image.url'),
                alt: p.name
              },
              sortOrder: 10,
              id: 'thumbnail'
            },
            {
              component: { default: Name },
              props: {
                name: p.name,
                url: p.url,
                id: p.productId
              },
              sortOrder: 20,
              id: 'name'
            },
            {
              component: { default: Price },
              props: {
                ...p.price
              },
              sortOrder: 30,
              id: 'price'
            }
          ]}
        />
      ))}
    </div>
  );
}