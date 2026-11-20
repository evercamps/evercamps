// ADR-0004: every attribute has one fixed role. A variant attribute tells the
// variants of a product apart (e.g. camp week), so it needs exactly one value
// from a fixed list: only select and period attributes can have that role.

export type AttributeRole = 'product' | 'variant';

export const VARIANT_ATTRIBUTE_TYPES = ['select', 'period'];

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
