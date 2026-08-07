import type { ProductAttributeData } from '@includes/types/product';
import type { ProductImportData, WooCommerceProduct, WooCommerceProductVariation } from '../types.js';
import type { VariationAttributeContext } from './importAttributes.js';

export function mapVariation(
  parentProduct: WooCommerceProduct,
  wcVariation: WooCommerceProductVariation,
  attributeContext: VariationAttributeContext
): ProductImportData {
  if (!wcVariation.sku) {
    wcVariation.sku = `wc_variation_${wcVariation.id}`;
  }

  const priceSource =
    wcVariation.regular_price ||
    wcVariation.price ||
    parentProduct.regular_price ||
    parentProduct.price ||
    '0';
  const price = parseFloat(priceSource);
  if (Number.isNaN(price)) {
    throw new Error(`WooCommerce variation ${wcVariation.id} has an invalid price.`);
  }

  const weightSource = wcVariation.weight || parentProduct.weight;
  const weight = weightSource ? parseFloat(weightSource) : 0;

  const optionValues: string[] = [];
  const attributes: ProductAttributeData[] = [];
  for (const wcAttr of wcVariation.attributes || []) {
    // A blank option means "Any <attribute>" in WooCommerce - nothing to
    // index for that attribute, not an error.
    if (!wcAttr.option) {
      continue;
    }
    const code = attributeContext.codeByWcAttributeName.get(wcAttr.name);
    if (!code) {
      throw new Error(
        `WooCommerce variation ${wcVariation.id} references unknown attribute "${wcAttr.name}".`
      );
    }
    const optionId = attributeContext.optionIdByCodeAndValue.get(`${code}::${wcAttr.option}`);
    if (!optionId) {
      throw new Error(
        `WooCommerce variation ${wcVariation.id} references unknown option "${wcAttr.option}" for attribute "${wcAttr.name}".`
      );
    }
    optionValues.push(wcAttr.option);
    attributes.push({ attribute_code: code, value: String(optionId) });
  }

  const parentSlug = parentProduct.slug || `wc-product-${parentProduct.id}`;

  return {
    // The family (see runVariationImport.ts) carries the shared name - a
    // variation's own name is just its distinguishing option values.
    name: optionValues.join(', ') || parentProduct.name,
    url_key: `${parentSlug}-${wcVariation.id}`,
    sku: wcVariation.sku,
    price,
    qty: wcVariation.manage_stock ? (wcVariation.stock_quantity ?? 0) : 0,
    manage_stock: wcVariation.manage_stock ? 1 : 0,
    stock_availability: wcVariation.stock_status === 'outofstock' ? 0 : 1,
    status: 1,
    weight: Number.isNaN(weight) ? 0 : weight,
    images: [],
    group_id: attributeContext.attributeGroupId,
    visibility: 1,
    type: 'simple',
    is_virtual: wcVariation.virtual ? 1 : 0,
    attributes
  };
}
