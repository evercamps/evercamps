import Area from '@components/common/Area';
import { useAppState } from '@components/common/context/app';
import { Empty } from '@components/frontStore/checkout/cart/Empty';
import Items from '@components/frontStore/checkout/cart/items/Items';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';
import { get } from '../../../../../lib/util/get.js';

interface Price {
  value: number;
  text: string;
}

interface CartItemRegistration {
  firstName: string;
  lastName: string;
  extraData?: string;
  editApi: string;
  removeApi: string;
}

interface CartItem {
  cartItemId: string;
  thumbnail?: string;
  qty: number;
  productName: string;
  productSku: string;
  variantOptions?: string;
  productCustomOptions?: string;
  productUrl: string;
  productPrice: Price;
  productPriceInclTax: Price;
  finalPrice: Price;
  finalPriceInclTax: Price;
  lineTotal: Price;
  lineTotalInclTax: Price;
  removeApi: string;
  updateQtyApi: string;
  manageRegistrations?: number;
  registrations: CartItemRegistration[];
  errors: string[];
}

interface Cart {
  totalQty: number;
  uuid: string;
  items: CartItem[];
}

interface Setting {
  priceIncludingTax: boolean;
  participantCheckoutFields?: string;
}

interface TitleProps {
  title: string;
}

function Title({ title }: TitleProps) {
  const items: any[] = get(useAppState(), 'cart.items', []);
  if (items.length <= 0) return null;

  return (
    <div className="mb-12 text-center shopping-cart-heading">
      <h1 className="shopping-cart-title mb-2">{title}</h1>
      <a href="/" className="underline">
        {_('Continue Shopping')}
      </a>
    </div>
  );
}

interface Props {
  cart: Cart;
  setting: Setting;
}

export default function ShoppingCart({ cart, setting }: Props) {
  const { totalQty = 0, items = [] } = cart || {};
  if (totalQty <= 0) {
    return <Empty />;
  }

  return (
    <div>
      <div className="cart page-width">
        <Area
          id="shoppingCartTop"
          className="cart-page-top"
          coreComponents={[
            {
              component: { default: Title },
              props: { title: 'Shopping cart' },
              sortOrder: 10,
              id: 'shoppingCartTitle'
            }
          ]}
        />
        <div className="cart-page-middle">
          <div className="grid gap-16 grid-cols-1 md:grid-cols-4">
            <Area
              id="shoppingCartLeft"
              className="col-span-1 md:col-span-3"
              coreComponents={[
                {
                  component: { default: Items },
                  props: { items, setting },
                  sortOrder: 10,
                  id: 'shoppingCartItems'
                }
              ]}
            />
            <Area
              id="shoppingCartRight"
              className="col-span-1 md:col-span-1"
            />
          </div>
        </div>
        <Area id="shoppingCartBottom" className="cart-page-bottom" />
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    cart {
      totalQty
      uuid
      items {
        cartItemId
        thumbnail
        qty
        productName
        productSku
        variantOptions
        productUrl
        productPrice {
          value
          text
        }
        productPriceInclTax {
          value
          text
        }
        finalPrice {
          value
          text
        }
        finalPriceInclTax {
          value
          text
        }
        lineTotal {
          value
          text
        }
        lineTotalInclTax {
          value
          text
        }
        removeApi
        updateQtyApi
        manageRegistrations
        registrations {
          firstName
          lastName
          extraData
          editApi
          removeApi
        }
        errors
      }
    }
    setting {
      priceIncludingTax
      participantCheckoutFields
    }
  }
`;
