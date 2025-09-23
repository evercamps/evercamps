import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // rename the image column in the product_image table to origin_image
  await execute(
    connection,
    `ALTER TABLE admin_user 
    ADD COLUMN IF NOT EXISTS twofa_enabled boolean NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS twofa_secret varchar NULL`
  );
};
