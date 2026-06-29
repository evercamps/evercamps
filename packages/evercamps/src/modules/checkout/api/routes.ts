import type { RouteDefinition } from '../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'shippingSetting',
    region: 'admin',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: null,
    region: 'frontStore',
    middleware: [
      { id: 'addCustomerToCart', after: ['auth'], before: ['buildQuery'] },
      { id: 'detectCurrentCart', after: ['context'], before: ['auth'] },
    ],
  },

  {
    routeId: 'cart',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'checkout',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'checkoutSuccess',
    region: 'frontStore',
    middleware: [
      { id: 'index', after: ['auth'], before: ['buildQuery'] },
    ],
  },

  {
    routeId: 'addCartAddress',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveAddress', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'addCartContactInfo',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveContactInfo', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'addCartItem',
    region: 'api',
    middleware: [
      { id: 'addItemToCart', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
    ],
  },

  {
    routeId: 'addCartPaymentMethod',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'savePaymentMethod', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'addCartShippingMethod',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveShippingMethod', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'addMineCartItem',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'detectCurrentCart', after: ['getCurrentCustomer'], before: ['apiResponse'] },
      { id: 'addItemToCart', after: ['detectCurrentCart'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'addShippingNote',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveShippingNote', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'addShippingZoneMethod',
    region: 'api',
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'validateMethod', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'addShippingZoneMethod', after: ['validateMethod'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createCart',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createNewCart', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createOrder',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'placeOrder', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createShippingMethod',
    region: 'api',
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'createShippingMethod', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createShippingZone',
    region: 'api',
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'createShippingZone', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteShippingZone',
    region: 'api',
    middleware: [
      { id: 'deleteShippingZone', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteShippingZoneMethod',
    region: 'api',
    middleware: [
      { id: 'deleteShippingZoneMethod', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'getPaymentMethods',
    region: 'api',
    middleware: [
      { id: 'sendMethods', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'getShippingMethods',
    region: 'api',
    middleware: [
      { id: 'sendMethods', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'removeCartItem',
    region: 'api',
    middleware: [
      { id: 'removeItem', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'removeCartItemRegistration',
    region: 'api',
    middleware: [
      { id: 'removeItem', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'removeMineCartItem',
    region: 'api',
    middleware: [
      { id: 'detectCurrentCart', after: ['getCurrentCustomer'], before: ['apiResponse'] },
      { id: 'removeItem', after: ['detectCurrentCart'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateCartItemQty',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateQty', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateCartItemRegistration',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateRegistration', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateMineCartItemQty',
    region: 'api',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'detectCurrentCart', after: ['getCurrentCustomer'], before: ['apiResponse'] },
      { id: 'updateQty', after: ['detectCurrentCart'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateShippingMethod',
    region: 'api',
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'updateShippingMethod', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateShippingZone',
    region: 'api',
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'updateShippingZone', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateShippingZoneMethod',
    region: 'api',
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'validateMethod', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'updateShippingZoneMethod', after: ['validateMethod'], before: ['apiResponse'] },
    ],
  }
];
