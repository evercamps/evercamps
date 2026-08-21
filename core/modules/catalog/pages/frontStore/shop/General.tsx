import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

export default function ShopInfo(): React.ReactElement {
  return (
    <div className="page-width">
      <div className="mb-4 md:mb-8">
        <div className="text-left ">
          <h1 className="shop-name mt-10">{_('Shop')}</h1>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};
