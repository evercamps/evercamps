import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE order_item_registration (
      order_item_registration_id INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      order_item_id INT NOT NULL,      
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      CONSTRAINT FK_ORDER_ITEM FOREIGN KEY (order_item_id) REFERENCES order_item (order_item_id) ON DELETE CASCADE
  )`
  );

};