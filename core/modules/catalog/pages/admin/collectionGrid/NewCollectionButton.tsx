import Button from '@components/form/Button';
import React from 'react';

interface NewCollectionButtonProps {
  newCollectionUrl: string;
}

export default function NewCollectionButton({
  newCollectionUrl
}: NewCollectionButtonProps) {
  return <Button url={newCollectionUrl} title="New Collection" />;
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newCollectionUrl: url(routeId: "collectionNew")
  }
`;