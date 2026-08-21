import Button from '@components/form/Button';
import React from 'react';

interface NewCategoryButtonProps {
  newCateoryUrl: string;
}

export default function NewCategoryButton({
  newCateoryUrl
}: NewCategoryButtonProps) {
  return <Button url={newCateoryUrl} title="New Category" />;
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newCateoryUrl: url(routeId: "categoryNew")
  }
`;