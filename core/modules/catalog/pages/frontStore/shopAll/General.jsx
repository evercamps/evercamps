import React from 'react';

import './General.scss';
import { _ } from '../../../../../lib/locale/translate/_.js';

export default function ShopAllInfo() {
  return (
    <div className="page-width">
      <div className="mb-4 md:mb-8">
        <div className="text-left ">
          <h1 className="shop-all-name mt-10">{_('All Products')}</h1>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};
