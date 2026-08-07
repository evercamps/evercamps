import { execute } from '@evershop/postgres-query-builder';

// Grows variant_group into a real "product family" record: shared content
// (name/description/images-adjacent SEO fields) for a group of variants,
// plus a default_variant_id to eventually drive a deterministic PLP tile
// instead of ProductCollection.js's current DISTINCT ON (..., random()).
export default async (connection) => {
  await execute(
    connection,
    `ALTER TABLE variant_group ADD COLUMN IF NOT EXISTS name varchar DEFAULT NULL`
  );
  await execute(
    connection,
    `ALTER TABLE variant_group ADD COLUMN IF NOT EXISTS url_key varchar DEFAULT NULL`
  );
  await execute(
    connection,
    `ALTER TABLE variant_group ADD COLUMN IF NOT EXISTS description text DEFAULT NULL`
  );
  await execute(
    connection,
    `ALTER TABLE variant_group ADD COLUMN IF NOT EXISTS short_description text DEFAULT NULL`
  );
  await execute(
    connection,
    `ALTER TABLE variant_group ADD COLUMN IF NOT EXISTS meta_title text DEFAULT NULL`
  );
  await execute(
    connection,
    `ALTER TABLE variant_group ADD COLUMN IF NOT EXISTS meta_description text DEFAULT NULL`
  );
  await execute(
    connection,
    `ALTER TABLE variant_group ADD COLUMN IF NOT EXISTS meta_keywords text DEFAULT NULL`
  );
  await execute(
    connection,
    `ALTER TABLE variant_group ADD COLUMN IF NOT EXISTS default_variant_id INT DEFAULT NULL REFERENCES product(product_id) ON DELETE SET NULL`
  );
  await execute(
    connection,
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'VARIANT_GROUP_URL_KEY_UNIQUE'
       ) THEN
         ALTER TABLE variant_group ADD CONSTRAINT "VARIANT_GROUP_URL_KEY_UNIQUE" UNIQUE (url_key);
       END IF;
     END $$;`
  );
};
