import { createHash } from 'crypto';

export type VariantOptionPair = {
  attributeId: number;
  optionId: number;
};

/**
 * Canonical hash for a variant's set of {attributeId, optionId} pairs, used by
 * variant_lookup.option_hash. Sorted by attributeId so pair order never
 * affects the result - callers on both the write side (import) and the read
 * side (a future variant resolver) must go through this single function so
 * the hash never drifts between two hand-rolled implementations.
 */
export function buildVariantOptionHash(pairs: VariantOptionPair[]): string {
  const canonical = [...pairs]
    .sort((a, b) => a.attributeId - b.attributeId)
    .map((pair) => `${pair.attributeId}:${pair.optionId}`)
    .join(',');
  return createHash('sha256').update(canonical).digest('hex');
}
