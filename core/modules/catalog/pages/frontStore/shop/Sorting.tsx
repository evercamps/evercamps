import Sorting from '@components/frontStore/catalog/product/list/Sorting';
import React from 'react';

export default function SortingWrapper(): React.ReactElement {
  return <Sorting />;
}

export const layout = {
  areaId: 'oneColumn',
  sortOrder: 15
};
