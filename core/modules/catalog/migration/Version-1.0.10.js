import { execute } from '@evershop/postgres-query-builder';

// General-purpose "doesn't need shipping" flag, generalizing the shipping
// skip behavior manage_registrations already does for camp products.
// Defaults FALSE (opposite of manage_registrations' TRUE default) since most
// existing products are physical goods that must keep requiring shipping.
export default async (connection) => {
  await execute(
    connection,
    `ALTER TABLE product ADD COLUMN IF NOT EXISTS is_virtual boolean NOT NULL DEFAULT FALSE`
  );
};
