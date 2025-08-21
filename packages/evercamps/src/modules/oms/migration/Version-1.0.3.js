import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `
    ALTER TABLE order_item_registration 
    ADD COLUMN IF NOT EXISTS registration_id INT;

    ALTER TABLE order_item_registration
    ADD CONSTRAINT FK_REGISTRATION
    FOREIGN KEY (registration_id) REFERENCES registration (registration_id)
    ON DELETE CASCADE;
    `
  );  
};