import type { ItemContext, ItemField } from '../types.js';

export const inventoryFields: ItemField[] = [
  {
    key: 'qty',
    resolvers: [
      async function(this: ItemContext) {
        const triggeredField = this.getTriggeredField();
        const requestedValue = this.getRequestedValue();
        const qty = triggeredField === 'qty' ? requestedValue : this.getData('qty');
        const product = await this.getProduct();

        // product_inventory.manage_stock stays the on/off switch. With a
        // variant, availability is that variant's seats minus the seats
        // already reserved by orders; without one (product with only real
        // variants and none chosen) the legacy product qty is used.
        if (product.manage_stock === true) {
          const variant = await this.getVariant();
          const available = variant
            ? parseInt(variant.total_seats ?? 0, 10) - parseInt(variant.reserved_seats ?? 0, 10)
            : product.qty;
          // Registrations of the same variant are separate lines (ADR-0006):
          // they share the variant's seats.
          const otherLinesQty = variant
            ? (this.getCart().getItems() || [])
                .filter(
                  (other) =>
                    other !== this &&
                    other.getData('product_variant_id') === variant.product_variant_id
                )
                .reduce((sum, other) => sum + (parseInt(other.getData('qty'), 10) || 0), 0)
            : 0;
          if (available < 1) {
            this.setError('qty', 'This item is out of stock');
          } else if (available < parseInt(qty, 10) + otherLinesQty) {
            this.setError('qty', 'We do not have enough stock');
          }
        }
        return parseInt(qty, 10) ?? null;
      }
    ],
    dependencies: ['product_id', 'product_variant_id']
  }
];
