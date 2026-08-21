interface Product {
  qty: string | number | null;
  stockAvailability: boolean;
  manageStock: boolean;
}

export default {
  Product: {
    inventory: async (product: Product) => ({
      ...product,
      qty: Number.parseInt(String(product.qty), 10),
      isInStock:
        (Number.parseInt(String(product.qty), 10) > 0 &&
          product.stockAvailability === true) ||
        product.manageStock === false
    })
  }
};