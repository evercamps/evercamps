import Button from '@components/form/Button';
import React from 'react';

interface NewProductButtonProps {
  newProductUrl: string;
}

export default function NewProductButton({
  newProductUrl
}: NewProductButtonProps) {
  return <Button url={newProductUrl} title="New Product" />;
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newProductUrl: url(routeId: "productNew")
  }
`;