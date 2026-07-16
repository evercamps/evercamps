export type ProductInventoryData = {
  qty: number,
  manage_stock: boolean,
  stock_availability: boolean,
  [key: string]: any
}

export type ProductAttributeData = {
  attribute_code: string,
  value: string,
  [key: string]: any
}

export type ProductData = ProductInventoryData & {
  name: string,
  url_key?: string,
  status: string,
  sku: string,
  price: number,
  group_id: number,
  visibility?: string,
  manage_registrations: string,
  attributes?: ProductAttributeData[],
  images?: string[],
  [key: string]: any
};
