import { execute } from '@evershop/postgres-query-builder';

export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE cart_item_registration ADD COLUMN IF NOT EXISTS extra_data JSON NULL;`
  );
};
