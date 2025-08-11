import { useCheckout } from '@components/common/context/checkout';
import MollieLogo from '@components/frontStore/mollie/MollieLogo.jsx';
import CheckoutForm from '@components/frontStore/mollie/checkout/CheckoutForm';
import PropTypes from 'prop-types';
import React from 'react';
import smallUnit from 'zero-decimal-currencies';
import createMollieClient from '@mollie/api-client';
import { useCheckoutDispatch } from '@components/common/context/checkout.jsx';

function Mollie({
  // total,
  // currency,
  // returnUrl,
  createPaymentApi,
  cartId,
  orderId
}) {
  // const options = {
  //   mode: 'payment',
  //   currency: currency.toLowerCase(),
  //   amount: Number(smallUnit(total, currency)),
  // };
  const [error, setError] = useState('');

  React.useEffect(() => {
    const createOrder = async () => {
      const response = await fetch(createPaymentApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: orderId,
          cart_id: cartId
        })
      });
      const data = await response.json();
      if (!response.error) {
        const { approveUrl } = data.data;
        // Redirect to PayPal for payment approval
        window.location.href = approveUrl;
      } else {
        setError(response.error.message);
      }
    };

    if (orderPlaced && orderId) {
      // Call the API to create the order
      createOrder();
    }
  }, [orderPlaced, orderId]);


  return (
    <div>
      {error && <div className="text-critical mb-4">{error}</div>}
      <div className="p-8 text-center border rounded mt-4 border-divider">
        {_('You will be redirected to Mollie')}
      </div>
    </div>
  );
}

Mollie.propTypes = {
  createPaymentApi: PropTypes.string.isRequired
};

export default function MollieMethod() {
  return (<p>blablabla</p>);
}

// export default function MollieMethod({
//   cart: { grandTotal, currency },
//   returnUrl,
//   createPaymentApi
// }) {
//   console.log("mollieMethod");
//   const checkout = useCheckout();
//   const {placeOrder} = useCheckoutDispatch();
//   const { steps, paymentMethods, setPaymentMethods, orderId } = checkout;
//   // Get the selected payment method
  
//   const selectedPaymentMethod = paymentMethods
//     ? paymentMethods.find((paymentMethod) => paymentMethod.selected)
//     : undefined;
//   console.log(selectedPaymentMethod);

//   useEffect(() => {
//     const selectedPaymentMethod = paymentMethods.find(
//       (paymentMethod) => paymentMethod.selected
//     );
//     if (
//       steps.every((step) => step.isCompleted) &&
//       selectedPaymentMethod.code === 'mollie'
//     ) {
//       placeOrder();
//     }
//   }, [steps]);

//   return (
//     <div>
//       <div className="flex justify-start items-center gap-4">
//         <RenderIfTrue
//           condition={
//             !selectedPaymentMethod || selectedPaymentMethod.code !== 'mollie'
//           }
//         >
//           <a
//             href="#"
//             onClick={(e) => {
//               e.preventDefault();
//               setPaymentMethods((previous) =>
//                 previous.map((paymentMethod) => {
//                   if (paymentMethod.code === 'mollie') {
//                     return {
//                       ...paymentMethod,
//                       selected: true
//                     };
//                   } else {
//                     return {
//                       ...paymentMethod,
//                       selected: false
//                     };
//                   }
//                 })
//               );
//             }}
//           >
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               width="18"
//               height="18"
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke="currentColor"
//               strokeWidth="2"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             >
//               <circle cx="12" cy="12" r="10" />
//             </svg>
//           </a>
//         </RenderIfTrue>
//         <RenderIfTrue
//           condition={
//             !!selectedPaymentMethod && selectedPaymentMethod.code === 'mollie'
//           }
//         >
//           <div>
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               width="18"
//               height="18"
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke="#2c6ecb"
//               strokeWidth="2"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             >
//               <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
//               <polyline points="22 4 12 14.01 9 11.01" />
//             </svg>
//           </div>
//         </RenderIfTrue>
//         <div>
//           <MollieLogo width={70} />
//         </div>
//       </div>
//       <div>
//         <RenderIfTrue
//           condition={
//             !!selectedPaymentMethod && selectedPaymentMethod.code === 'mollie'
//           }
//         >
//           <div>
//             <Mollie
//               createPaymentApi={createPaymentApi}
//               cartId={cartId}
//               orderId={orderId}
//             />
//           </div>
//         </RenderIfTrue>
//       </div>
//     </div>
//   );
// }

MollieMethod.propTypes = {};
// MollieMethod.propTypes = {
//   cart: PropTypes.shape({
//     grandTotal: PropTypes.shape({
//       value: PropTypes.number
//     }),
//     currency: PropTypes.string
//   }).isRequired,
//   returnUrl: PropTypes.string.isRequired,
//   createPaymentApi: PropTypes.string.isRequired
// };

export const layout = {
  areaId: 'checkoutPaymentMethodmollie',
  sortOrder: 10
};

export const query = `
  query Query {
    createPaymentApi: url(routeId: "createPayment")
  }
`;
// export const query = `
//   query Query {
//     setting {
//       mollieDisplayName
//       mollieLiveApiKey
//       mollieTestApiKey
//       molliePaymentMode
//     }
//     cart {
//       grandTotal {
//         value
//       }
//       currency
//     }
//     returnUrl: url(routeId: "mollieReturn")
//     createPaymentApi: url(routeId: "createPayment")
//   }
// `;
