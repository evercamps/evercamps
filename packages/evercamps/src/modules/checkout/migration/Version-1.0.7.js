import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Rename sub_total column to line_total
  await execute(
    connection,
    `CREATE TABLE cart_item_registration (
      cart_item_registration_id INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      cart_item_id INT NOT NULL,      
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      CONSTRAINT FK_CART_ITEM FOREIGN KEY (cart_item_id) REFERENCES cart_item (cart_item_id) ON DELETE CASCADE
  )`
  );
  
};
