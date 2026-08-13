import ProductMediaManager from '@components/admin/catalog/productEdit/media/ProductMediaManager';
import { Card } from '@components/admin/cms/Card';
import React from 'react';

interface ProductImage {
  id: string;
  url: string;
}

interface Product {
  gallery?: ProductImage[];
  image?: ProductImage;
}

interface MediaProps {
  id?: string;
  product?: Product | null;
  productImageUploadUrl: string;
}

export default function Media({
  id = 'images',
  product = null,
  productImageUploadUrl
}: MediaProps) {
  const image = product?.image;
  let gallery = product?.gallery || [];

  if (image) {
    gallery = [image].concat(gallery);
  }

  return (
    <Card title="Media">
      <Card.Session>
        <ProductMediaManager
          id={id || 'images'}
          productImages={gallery}
          productImageUploadUrl={productImageUploadUrl}
        />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 15
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      image {
        id: uuid
        url
      }
      gallery {
        id: uuid
        url
      }
    }
    productImageUploadUrl: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
  }
`;