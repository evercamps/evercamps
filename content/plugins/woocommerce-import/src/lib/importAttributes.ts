import { insert, insertOnUpdate, select } from '@evershop/postgres-query-builder';
import { createProductAttribute, pool } from '../core.js';
import type { WooCommerceProduct } from '../types.js';

export interface VariationAttributeContext {
  attributeGroupId: number;
  attributeCodes: string[];
  codeByWcAttributeName: Map<string, string>;
  optionIdByCodeAndValue: Map<string, number>;
}

// Stable, reusable across products/runs so "Color" is only ever created once
// - evercamps' attribute system is global/shared, unlike WooCommerce's
// per-product attributes.
function slugifyAttributeCode(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w]+/g, '');
  return `wc_attr_${slug}`;
}

async function findOrCreateAttribute(name: string, optionTexts: string[]) {
  const code = slugifyAttributeCode(name);
  let attribute = await select().from('attribute').where('attribute_code', '=', code).load(pool);

  if (!attribute) {
    const created = await createProductAttribute(
      {
        attribute_code: code,
        attribute_name: name,
        type: 'select',
        is_required: 0,
        display_on_frontend: 1,
        groups: [],
        options: optionTexts.map((option_text) => ({ option_text }))
      },
      { routeId: 'wc-import' }
    );
    attribute = await select()
      .from('attribute')
      .where('attribute_id', '=', created.insertId)
      .load(pool);
  } else {
    const existingOptions = await select()
      .from('attribute_option')
      .where('attribute_id', '=', attribute.attribute_id)
      .execute(pool);
    const existingTexts = new Set(existingOptions.map((o: any) => o.option_text));
    const missing = optionTexts.filter((text) => !existingTexts.has(text));
    // insertAttributeOptions() (createProductAttribute.ts) only runs at
    // attribute-creation time and has no dedup - inserting missing options
    // for an already-existing attribute is handled here instead.
    for (const option_text of missing) {
      await insert('attribute_option')
        .given({ attribute_id: attribute.attribute_id, attribute_code: code, option_text })
        .execute(pool);
    }
  }

  return attribute;
}

// One attribute_group per unique set of attribute codes, reused across
// unrelated products that happen to share the same variation attributes
// (e.g. two different products both using Color+Size), tracked via
// woocommerce_attribute_group_map since nothing in core lets us reverse a
// code set back into a group otherwise.
async function resolveAttributeGroup(attributeCodes: string[], attributeIds: number[]) {
  const key = [...attributeCodes].sort().join(',');
  const existingMap = await select()
    .from('woocommerce_attribute_group_map')
    .where('attribute_set_key', '=', key)
    .load(pool);
  if (existingMap) {
    return existingMap.attribute_group_id;
  }

  const group = await insert('attribute_group')
    .given({ group_name: `WooCommerce: ${attributeCodes.join(' + ')}` })
    .execute(pool);
  const attributeGroupId = group.insertId;

  for (const attributeId of attributeIds) {
    await insertOnUpdate('attribute_group_link', ['attribute_id', 'group_id'])
      .given({ attribute_id: attributeId, group_id: attributeGroupId })
      .execute(pool);
  }

  await insert('woocommerce_attribute_group_map')
    .given({ attribute_set_key: key, attribute_group_id: attributeGroupId })
    .execute(pool);

  return attributeGroupId;
}

// Returns null for a variable product with no variation-defining attributes
// (shouldn't normally happen, but WooCommerce doesn't guarantee it).
export async function resolveVariationAttributeContext(
  wcProduct: WooCommerceProduct
): Promise<VariationAttributeContext | null> {
  const variationAttributes = (wcProduct.attributes || []).filter((a) => a.variation);
  if (variationAttributes.length === 0) {
    return null;
  }
  if (variationAttributes.length > 5) {
    throw new Error(
      `WooCommerce product ${wcProduct.id} has more than 5 variation attributes; evercamps supports at most 5.`
    );
  }

  const codeByWcAttributeName = new Map<string, string>();
  const optionIdByCodeAndValue = new Map<string, number>();
  const attributeIds: number[] = [];
  const attributeCodes: string[] = [];

  for (const wcAttribute of variationAttributes) {
    const attribute = await findOrCreateAttribute(wcAttribute.name, wcAttribute.options || []);
    codeByWcAttributeName.set(wcAttribute.name, attribute.attribute_code);
    attributeIds.push(attribute.attribute_id);
    attributeCodes.push(attribute.attribute_code);

    const options = await select()
      .from('attribute_option')
      .where('attribute_id', '=', attribute.attribute_id)
      .execute(pool);
    options.forEach((option: any) => {
      optionIdByCodeAndValue.set(`${attribute.attribute_code}::${option.option_text}`, option.attribute_option_id);
    });
  }

  const attributeGroupId = await resolveAttributeGroup(attributeCodes, attributeIds);

  return { attributeGroupId, attributeCodes, codeByWcAttributeName, optionIdByCodeAndValue };
}
