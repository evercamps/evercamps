import Meta from '@components/Meta';
import Title from '@components/Title';
import React from 'react';

export default function SeoMeta() {
  return (
    <>
      <Title title="Page Not Found" />
      <Meta name="description" content="Page Not Found" />
    </>
  );
}

export const layout = {
  areaId: 'head',
  sortOrder: 1
};
