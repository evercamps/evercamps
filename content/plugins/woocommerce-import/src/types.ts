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

export interface ProductImportData {
  name: string;
  url_key: string;
  status: 0 | 1;
  sku: string;
  price: number;
  qty: number;
  manage_stock: 0 | 1;
  stock_availability: 0 | 1;
  weight?: number;
  group_id: number;
  visibility: 0 | 1;
  manage_registrations: 0 | 1;
  images: string[];
  [key: string]: unknown;
}

export type BatchStatus = 'running' | 'completed' | 'partial' | 'failed';

export interface ImportBatchSummary {
  woocommerce_import_batch_id: number;
  uuid: string;
  status: BatchStatus;
  total_fetched: number;
  total_created: number;
  total_updated: number;
  total_failed: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}
