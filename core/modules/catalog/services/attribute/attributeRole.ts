// ADR-0004: every attribute has one fixed role. A variant attribute tells the
// variants of a product apart (e.g. camp week), so it needs exactly one value
// from a fixed list: only select and period attributes can have that role.

export const ATTRIBUTE_ROLES = ['product', 'variant'] as const;

export type AttributeRole = (typeof ATTRIBUTE_ROLES)[number];

export const VARIANT_ATTRIBUTE_TYPES: readonly string[] = ['select', 'period'];

export function isVariantAttribute(attribute: { role?: unknown }): boolean {
  return attribute.role === 'variant';
}

export function assertRoleFitsType(role: unknown, type: string): void {
  if (role === undefined || role === null || role === 'product') {
    return;
  }
  if (role !== 'variant') {
    throw new Error(`Unknown attribute role "${String(role)}"`);
  }
  if (!VARIANT_ATTRIBUTE_TYPES.includes(type)) {
    throw new Error('Only select and period attributes can be variant attributes');
  }
}
