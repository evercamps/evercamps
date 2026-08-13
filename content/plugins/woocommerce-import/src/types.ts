import type { ProductData } from '@includes/types/product';

export interface WooCommerceSettings {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface WooCommerceProductImage {
  src: string;
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  status: string;
  regular_price: string;
  price: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  weight: string;
  date_modified: string;
  images: WooCommerceProductImage[];
}

// ProductData (core's type for createProduct/updateProduct) types status,
// manage_stock, stock_availability, visibility and manage_registrations as
// string/boolean, but productDataSchema.json actually accepts (and mapProduct
// produces) the 0|1 numeric form for all of them - so those fields are
// narrowed here instead of inherited as-is.
export interface ProductImportData
  extends Omit<
    ProductData,
    'status' | 'manage_stock' | 'stock_availability' | 'visibility' | 'manage_registrations'
  > {
  url_key: string;
  status: 0 | 1;
  manage_stock: 0 | 1;
  stock_availability: 0 | 1;
  weight?: number;
  visibility: 0 | 1;
  manage_registrations: 0 | 1;
  images: string[];
}

export type BatchStatus = 'running' | 'completed' | 'partial' | 'failed';
export type BatchType = 'products' | 'orders';

export interface ImportBatchSummary {
  woocommerce_import_batch_id: number;
  uuid: string;
  type: BatchType;
  status: BatchStatus;
  total_fetched: number;
  total_created: number;
  total_updated: number;
  total_failed: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface WooCommerceOrderAddress {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface WooCommerceOrderLineItem {
  id: number;
  product_id: number;
  variation_id: number;
  name: string;
  sku: string;
  quantity: number;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
}

export interface WooCommerceOrder {
  id: number;
  number: string;
  status: string;
  currency: string;
  date_created: string;
  date_modified: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  customer_id: number;
  payment_method: string;
  payment_method_title: string;
  billing: WooCommerceOrderAddress;
  shipping: WooCommerceOrderAddress;
  line_items: WooCommerceOrderLineItem[];
}

export interface OrderAddressImportData {
  full_name: string;
  postcode: string | null;
  telephone: string | null;
  country: string | null;
  province: string | null;
  city: string | null;
  address_1: string | null;
  address_2: string | null;
}

export interface OrderItemImportData {
  externalProductId: number;
  product_sku: string;
  product_name: string;
  qty: number;
  product_price: number;
  product_price_incl_tax: number;
  final_price: number;
  final_price_incl_tax: number;
  tax_percent: number;
  tax_amount: number;
  tax_amount_before_discount: number;
  discount_amount: number;
  line_total: number;
  line_total_incl_tax: number;
  line_total_with_discount: number;
  line_total_with_discount_incl_tax: number;
}

export interface OrderImportData {
  order_number: string;
  currency: string;
  customer_email: string | null;
  customer_full_name: string | null;
  payment_method: string | null;
  payment_method_name: string | null;
  paymentStatus: string;
  shipmentStatus: string;
  createdAt: string;
  shipping_fee_excl_tax: number;
  shipping_fee_incl_tax: number;
  shipping_tax_amount: number;
  discount_amount: number;
  sub_total: number;
  sub_total_incl_tax: number;
  sub_total_with_discount: number;
  sub_total_with_discount_incl_tax: number;
  tax_amount: number;
  tax_amount_before_discount: number;
  total_tax_amount: number;
  total_qty: number;
  grand_total: number;
  billingAddress: OrderAddressImportData | null;
  shippingAddress: OrderAddressImportData | null;
  items: OrderItemImportData[];
}
