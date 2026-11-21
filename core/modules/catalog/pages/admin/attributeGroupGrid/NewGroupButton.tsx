import Button from '@components/form/Button';
import React from 'react';

interface NewGroupButtonProps {
  newGroupUrl: string;
}

export default function NewGroupButton({ newGroupUrl }: NewGroupButtonProps) {
  return <Button url={newGroupUrl} title="New attribute group" />;
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newGroupUrl: url(routeId: "attributeGroupNew")
  }
`;
