import { pool } from '../../../core.js';

interface CartRow {
  cartId?: number;
}

async function cartRow(cartId?: number) {
  if (!cartId) {
    return null;
  }
  const result = await (pool as any).query(
    `SELECT payer_national_number, payer_national_number_not_applicable FROM cart WHERE cart_id = $1`,
    [cartId]
  );
  return result.rows[0] ?? null;
}

export default {
  Cart: {
    payerNationalNumber: async (cart: CartRow) => (await cartRow(cart.cartId))?.payer_national_number ?? null,
    payerNationalNumberNotApplicable: async (cart: CartRow) =>
      !!(await cartRow(cart.cartId))?.payer_national_number_not_applicable,
    needsPayerNationalNumber: async (cart: CartRow) => {
      if (!cart.cartId) {
        return false;
      }
      const result = await (pool as any).query(
        `SELECT 1 FROM cart_item ci
         JOIN product p ON p.product_id = ci.product_id
         WHERE ci.cart_id = $1 AND p.fiscal_attest_eligible AND p.manage_registrations
         LIMIT 1`,
        [cart.cartId]
      );
      return result.rows.length > 0;
    }
  }
};
