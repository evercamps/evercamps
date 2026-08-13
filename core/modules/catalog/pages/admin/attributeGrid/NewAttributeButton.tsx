import Button from '@components/form/Button';
import React from 'react';

interface NewAttributeButtonProps {
  newAttributeUrl: string;
}

export default function NewAttributeButton({
  newAttributeUrl
}: NewAttributeButtonProps) {
  return <Button url={newAttributeUrl} title="New Attribute" />;
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newAttributeUrl: url(routeId: "attributeNew")
  }
`;