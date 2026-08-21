import PageHeading from '@components/admin/cms/PageHeading';
import React from 'react';

interface Product {
  name: string;
}

interface ProductEditPageHeadingProps {
  backUrl: string;
  product?: Product | null;
}

export default function ProductEditPageHeading({
  backUrl,
  product = null
}: ProductEditPageHeadingProps) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={product ? `Editing ${product.name}` : 'Create a new product'}
    />
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      name
    }
    backUrl: url(routeId: "productGrid")
  }
`;