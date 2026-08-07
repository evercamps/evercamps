import type { ProductImportData, WooCommerceProduct } from '../types.js';

// Attribute group 1 is evercamps' default/undeletable attribute group (see
// core/modules/catalog/api/deleteAttributeGroup/deleteAttributeGroup.js, which
// special-cases attribute_group_id === 1 as non-removable) - safe to hardcode
// as the group for every imported product since WooCommerce attributes aren't
// mapped to evercamps' attribute system in v1.
const DEFAULT_ATTRIBUTE_GROUP_ID = 1;

export function mapProduct(wcProduct: WooCommerceProduct): ProductImportData {
  if (!wcProduct.sku) {
    wcProduct.sku = `wc_product_${wcProduct.id}`;
  }

  const price = parseFloat(wcProduct.regular_price || wcProduct.price || '0');
  if (Number.isNaN(price)) {
    throw new Error(`WooCommerce product ${wcProduct.id} has an invalid price.`);
  }

  const weight = wcProduct.weight ? parseFloat(wcProduct.weight) : 0;

  return {
    name: wcProduct.name,
    url_key: wcProduct.slug ? wcProduct.slug : wcProduct.name.toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, ''),            // Trim - from end of text,
    sku: wcProduct.sku,
    price,
    qty: wcProduct.manage_stock ? (wcProduct.stock_quantity ?? 0) : 0,
    manage_stock: wcProduct.manage_stock ? 1 : 0,
    stock_availability: wcProduct.stock_status === 'outofstock' ? 0 : 1,
    status: wcProduct.status === 'publish' ? 1 : 0,
    weight: Number.isNaN(weight) ? 0 : weight,
    // Populated by resolveProductImages() in runImport.ts - local media URLs,
    // not the external WooCommerce ones, so this stays a placeholder here.
    images: [],
    group_id: DEFAULT_ATTRIBUTE_GROUP_ID,
    visibility: 1,
    type: 'simple',
    is_virtual: wcProduct.virtual ? 1 : 0
  };
}
