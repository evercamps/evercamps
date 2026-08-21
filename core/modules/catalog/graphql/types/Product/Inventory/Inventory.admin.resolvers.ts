interface Inventory {
  qty?: number | null;
}

export default {
  Inventory: {
    qty: (inventory: Inventory): number => inventory.qty || 0
  }
};