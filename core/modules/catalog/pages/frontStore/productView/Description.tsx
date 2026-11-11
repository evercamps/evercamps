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
  product?: {
    description?: DescriptionRow[] | null;
  } | null;
}

export default function Description({ product }: DescriptionProps) {
  const description = product?.description;
  // Imported products often have no description yet.
  if (!Array.isArray(description) || description.length === 0) {
    return null;
  }
  return (
    <div className="mt-8 md:mt-12">
      <div className="product-description">
        <Editor rows={description} />
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