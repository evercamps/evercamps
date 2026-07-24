import { Card } from '@components/admin/cms/Card';
import { Discount } from '@components/admin/oms/orderEdit/payment/Discount';
import { Shipping } from '@components/admin/oms/orderEdit/payment/Shipping';
import { SubTotal } from '@components/admin/oms/orderEdit/payment/SubTotal';
import { Tax } from '@components/admin/oms/orderEdit/payment/Tax';
import { Total } from '@components/admin/oms/orderEdit/payment/Total';
import Area from '@components/Area';
import { Circle, type CircleVariant } from '@components/Circle';
import React from 'react';
import './Payment.scss';

interface Money {
  text: string;
}

interface PaymentStatus {
  code?: string;
  badge?: CircleVariant;
  progress?: string;
  name?: string;
}

interface Order {
  orderId: string;
  coupon?: string;
  shippingMethodName?: string;
  paymentMethodName?: string;
  totalQty: number;
  totalTaxAmount: Money;
  discountAmount: Money;
  grandTotal: Money;
  subTotal: Money;
  shippingFeeInclTax: Money;
  currency: string;
  paymentStatus: PaymentStatus;
}

interface OrderSummaryProps {
  order: Order;
}

export default function OrderSummary({
  order: {
    orderId,
    coupon,
    shippingMethodName,
    paymentMethodName,
    totalQty,
    totalTaxAmount,
    discountAmount,
    grandTotal,
    subTotal,
    shippingFeeInclTax,
    currency,
    paymentStatus
  }
}: OrderSummaryProps) {
  return (
    <Card
      title={
        <div className="flex space-x-4">
          <Circle variant={paymentStatus.badge ?? 'default'} />
          <span className="block self-center">
            {`${paymentStatus.name || 'Unknown'} - ${
              paymentMethodName || 'Unknown'
            }`}
          </span>
        </div>
      }
    >
      <Card.Session>
        <Area
          id="orderSummaryBlock"
          orderId={orderId}
          currency={currency}
          grandTotal={grandTotal}
          coupon={coupon}
          discountAmount={discountAmount}
          totalTaxAmount={totalTaxAmount}
          className="summary-wrapper"
          coreComponents={[
            {
              component: { default: SubTotal },
              props: {
                count: totalQty,
                total: subTotal.text
              },
              sortOrder: 5
            },
            {
              component: { default: Shipping },
              props: {
                method: shippingMethodName,
                cost: shippingFeeInclTax.text
              },
              sortOrder: 10
            },
            {
              component: { default: Discount },
              props: {
                code: coupon,
                discount: discountAmount.text
              },
              sortOrder: 15
            },
            {
              component: { default: Tax },
              props: {
                taxClass: '',
                amount: totalTaxAmount.text
              },
              sortOrder: 20
            },
            {
              component: { default: Total },
              props: {
                total: grandTotal.text
              },
              sortOrder: 30
            }
          ]}
        />
      </Card.Session>

      <Area id="orderPaymentActions" />
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 20
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      orderId
      totalQty
      coupon
      shippingMethodName
      paymentMethod
      paymentMethodName
      totalTaxAmount {
        text(currency: getContextValue("orderCurrency"))
      }
      discountAmount {
        text(currency: getContextValue("orderCurrency"))
      }
      grandTotal {
        text(currency: getContextValue("orderCurrency"))
      }
      subTotal {
        text(currency: getContextValue("orderCurrency"))
      }
      shippingFeeInclTax {
        text(currency: getContextValue("orderCurrency"))
      }
      currency
      paymentStatus {
        code
        badge
        progress
        name
      }
    }
  }
`;