import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // rename the image column in the product_image table to origin_image
  await execute(
    connection,
    `ALTER TABLE product ADD COLUMN IF NOT EXISTS manage_registrations boolean NOT NULL DEFAULT TRUE`
  );
};
