import Area from '@components/Area';
import React from 'react';

export default function ShopAllPage() {
  return (
    <div className="page-width grid grid-cols-1 ">
      <Area id="oneColumn" />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
