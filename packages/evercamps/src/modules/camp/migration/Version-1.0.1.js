import { execute } from "@evershop/postgres-query-builder";

export default async function (connection) {
  await execute(
    connection,
    `
    ALTER TABLE participant
    ADD COLUMN IF NOT EXISTS customer_id INT;

    ALTER TABLE participant
    ADD CONSTRAINT FK_CUSTOMER
    FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE SET NULL;
    `
  );  
}