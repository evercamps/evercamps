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
