import type { RouteDefinition } from '../../../lib/middleware/types.js';

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
    path: '/carts/:cart_id/addresses',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveAddress', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'addCartContactInfo',
    region: 'api',
    path: '/carts/:cart_id/contacts',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveContactInfo', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'addCartItem',
    region: 'api',
    path: '/cart/:cart_id/items',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'addItemToCart', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
    ],
  },

  {
    routeId: 'addCartPaymentMethod',
    region: 'api',
    path: '/carts/:cart_id/paymentMethods',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'savePaymentMethod', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'addCartShippingMethod',
    region: 'api',
    path: '/carts/:cart_id/shippingMethods',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveShippingMethod', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'addMineCartItem',
    region: 'api',
    path: '/cart/mine/items',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'detectCurrentCart', after: ['getCurrentCustomer'], before: ['apiResponse'] },
      { id: 'addItemToCart', after: ['detectCurrentCart'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'addShippingNote',
    region: 'api',
    path: '/carts/:cart_id/shippingNotes',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'saveShippingNote', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'addShippingZoneMethod',
    region: 'api',
    path: '/shippingZones/:id/methods',
    methods: ['POST'],
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'validateMethod', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'addShippingZoneMethod', after: ['validateMethod'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createCart',
    region: 'api',
    path: '/carts',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'createNewCart', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createOrder',
    region: 'api',
    path: '/orders',
    methods: ['POST'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'placeOrder', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createShippingMethod',
    region: 'api',
    path: '/shippingMethods',
    methods: ['POST'],
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'createShippingMethod', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'createShippingZone',
    region: 'api',
    path: '/shippingZones',
    methods: ['POST'],
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'createShippingZone', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteShippingZone',
    region: 'api',
    path: '/shippingZones/:id',
    methods: ['DELETE'],
    middleware: [
      { id: 'deleteShippingZone', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'deleteShippingZoneMethod',
    region: 'api',
    path: '/shippingZones/:zone_id/methods/:method_id',
    methods: ['DELETE'],
    middleware: [
      { id: 'deleteShippingZoneMethod', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'getPaymentMethods',
    region: 'api',
    path: '/paymentMethods',
    methods: ['GET'],
    access: 'public',
    middleware: [
      { id: 'sendMethods', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'getShippingMethods',
    region: 'api',
    path: '/shippingMethods/:cart_id',
    methods: ['GET'],
    access: 'public',
    middleware: [
      { id: 'sendMethods', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'removeCartItem',
    region: 'api',
    path: '/cart/:cart_id/items/:item_id',
    methods: ['DELETE'],
    access: 'public',
    middleware: [
      { id: 'removeItem', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'removeCartItemRegistration',
    region: 'api',
    path: '/cart/:cart_id/items/:item_id/registrations/:registration_id',
    methods: ['DELETE'],
    access: 'public',
    middleware: [
      { id: 'removeItem', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'removeMineCartItem',
    region: 'api',
    path: '/cart/mine/items/:item_id',
    methods: ['DELETE'],
    access: 'public',
    middleware: [
      { id: 'detectCurrentCart', after: ['getCurrentCustomer'], before: ['apiResponse'] },
      { id: 'removeItem', after: ['detectCurrentCart'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateCartItemQty',
    region: 'api',
    path: '/cart/:cart_id/items/:item_id',
    methods: ['PATCH'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateQty', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateCartItemRegistration',
    region: 'api',
    path: '/cart/:cart_id/items/:item_id/registrations/:registration_id',
    methods: ['PATCH'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'updateRegistration', after: ['bodyParser'], before: ['apiResponse'] },
      { id: 'updateRegistration', after: ['bodyParser'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateMineCartItemQty',
    region: 'api',
    path: '/cart/mine/items/:item_id',
    methods: ['PATCH'],
    access: 'public',
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'detectCurrentCart', after: ['getCurrentCustomer'], before: ['apiResponse'] },
      { id: 'updateQty', after: ['detectCurrentCart'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateShippingMethod',
    region: 'api',
    path: '/shippingMethods/:id',
    methods: ['PATCH'],
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'updateShippingMethod', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateShippingZone',
    region: 'api',
    path: '/shippingZones/:id',
    methods: ['PATCH'],
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'updateShippingZone', after: ['escapeHtml'], before: ['apiResponse'] },
    ],
  },

  {
    routeId: 'updateShippingZoneMethod',
    region: 'api',
    path: '/shippingZones/:zone_id/methods/:method_id',
    methods: ['PATCH'],
    middleware: [
      { id: 'borderParser', after: ['context'], before: ['auth'] },
      { id: 'validateMethod', after: ['escapeHtml'], before: ['apiResponse'] },
      { id: 'updateShippingZoneMethod', after: ['validateMethod'], before: ['apiResponse'] },
    ],
  }
];
