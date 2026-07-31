interface Product {
  price: string | number | null;
}

export default {
  Product: {
    price: (product: Product) => {
      const price = Number.parseFloat(String(product.price));

      return {
        regular: price,
        special: price // TODO: implement special price
      };
    }
  }
};