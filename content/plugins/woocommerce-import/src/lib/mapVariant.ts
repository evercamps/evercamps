import type { WooCommerceProduct, WooCommerceVariation } from '../types.js';

export interface VariantAttributeSelection {
  attribute_name: string;
  option_text: string;
}

export interface VariantImportInput {
  external_variation_id: number;
  sku?: string;
  regular_price?: string;
  price?: string;
  stock_quantity: number | null;
  // A WooCommerce variation's own manage_stock can also be the literal
  // string 'parent', meaning it inherits the parent product's stock
  // management instead of tracking its own.
  manage_stock: boolean | 'parent';
  attributes: VariantAttributeSelection[];
  date_modified?: string;
}

export interface VariantImportData {
  sku: string;
  price: number;
  title: string | null;
  total_seats: number;
  attributes: VariantAttributeSelection[];
}

function resolveSeats(
  manageStock: boolean | 'parent',
  stockQuantity: number | null,
  parent: Pick<WooCommerceProduct, 'manage_stock' | 'stock_quantity'>
): number {
  if (manageStock === 'parent') {
    return parent.manage_stock ? parent.stock_quantity ?? 0 : 0;
  }
  return manageStock ? stockQuantity ?? 0 : 0;
}

export function variantInputFromVariation(wcVariation: WooCommerceVariation): VariantImportInput {
  return {
    external_variation_id: wcVariation.id,
    sku: wcVariation.sku,
    regular_price: wcVariation.regular_price,
    price: wcVariation.price,
    stock_quantity: wcVariation.stock_quantity,
    manage_stock: wcVariation.manage_stock,
    attributes: wcVariation.attributes.map((attribute) => ({
      attribute_name: attribute.name,
      option_text: attribute.option
    })),
    date_modified: wcVariation.date_modified
  };
}

// A 'simple' WooCommerce product has no variations, but per the ERD every
// product must have at least one product_variant row - this builds a
// synthetic single default variant from the product's own fields. The
// product's own id doubles as its "variation id" for
// woocommerce_variation_map: WooCommerce post ids are a single global
// namespace, so a real variation id can never collide with its own parent
// product's id.
export function variantInputFromSimpleProduct(wcProduct: WooCommerceProduct): VariantImportInput {
  return {
    external_variation_id: wcProduct.id,
    sku: wcProduct.sku,
    regular_price: wcProduct.regular_price,
    price: wcProduct.price,
    stock_quantity: wcProduct.stock_quantity,
    manage_stock: wcProduct.manage_stock,
    attributes: [],
    date_modified: wcProduct.date_modified
  };
}

export function mapVariant(
  input: VariantImportInput,
  parent: Pick<WooCommerceProduct, 'manage_stock' | 'stock_quantity' | 'price' | 'regular_price'>
): VariantImportData {
  const sku = input.sku || `wc_variation_${input.external_variation_id}`;

  const price = parseFloat(
    input.regular_price || input.price || parent.regular_price || parent.price || '0'
  );
  if (Number.isNaN(price)) {
    throw new Error(`WooCommerce variation ${input.external_variation_id} has an invalid price.`);
  }

  const title =
    input.attributes.length > 0
      ? input.attributes.map((attribute) => attribute.option_text).join(' / ')
      : null;

  return {
    sku,
    price,
    title,
    total_seats: resolveSeats(input.manage_stock, input.stock_quantity, parent),
    attributes: input.attributes
  };
}
