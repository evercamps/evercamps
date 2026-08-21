import Editor from '@components/Editor';
import React from 'react';

interface DescriptionColumn {
  size: number;
  data?: object;
}

interface DescriptionRow {
  size: number;
  columns: DescriptionColumn[];
}

interface DescriptionProps {
  product: {
    description: DescriptionRow[];
  };
}

export default function Description({
  product: { description }
}: DescriptionProps) {
  return (
    <div className="mt-8 md:mt-12">
      <div className="product-description">
        <Editor rows={description} />
        bb
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'productPageMiddleRight',
  sortOrder: 50
};

export const query = `
  query Query {
    product (id: getContextValue('productId')) {
      description
    }
  }`;