export interface Price {
  value: number;
  text: string;
}

export interface CartItemRegistration {
  cartItemRegistrationId?: string;
  cartItemId?: string;
  firstName: string;
  lastName: string;
  extraData?: string;
  editApi: string;
  removeApi: string;
}

export interface CartItem {
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

export interface ParticipantCheckoutField {
  code: string;
  label: string;
  type: 'text' | 'date' | 'select';
  required: boolean;
  useForUniqueness: boolean;
}

export interface CheckoutSetting {
  priceIncludingTax: boolean;
  participantCheckoutFields?: string;
}

export interface PaymentMethodOption {
  [key: string]: unknown;
  selected: boolean;
}
