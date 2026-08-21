import { execute } from '@evershop/postgres-query-builder';

export default async (connection : any) => {
  // PRODUCT_VARIANT: a real variant row, distinct from a product row
  await execute(
    connection,
    `CREATE TABLE "product_variant" (
  "product_variant_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "product_id" INT NOT NULL,
  "sku" varchar NOT NULL,
  "price" decimal(12,4) NOT NULL,
  "title" varchar DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PRODUCT_VARIANT_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "PRODUCT_VARIANT_SKU_UNIQUE" UNIQUE ("sku"),
  CONSTRAINT "UNSIGNED_PRODUCT_VARIANT_PRICE" CHECK(price >= 0),
  CONSTRAINT "FK_PRODUCT_VARIANT_PRODUCT" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_PRODUCT_VARIANT_PRODUCT" ON "product_variant" ("product_id")`
  );

  // VARIANT_ATTRIBUTE_VALUE: attribute values that differentiate a variant,
  // split out from the shared product_attribute_value_index table
  await execute(
    connection,
    `CREATE TABLE "variant_attribute_value" (
  "variant_attribute_value_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "variant_id" INT NOT NULL,
  "attribute_id" INT NOT NULL,
  "option_id" INT DEFAULT NULL,
  CONSTRAINT "VARIANT_ATTRIBUTE_VALUE_UNIQUE" UNIQUE ("variant_id","attribute_id"),
  CONSTRAINT "FK_VARIANT_ATTRIBUTE_VALUE_VARIANT" FOREIGN KEY ("variant_id") REFERENCES "product_variant" ("product_variant_id") ON DELETE CASCADE,
  CONSTRAINT "FK_VARIANT_ATTRIBUTE_VALUE_ATTRIBUTE" FOREIGN KEY ("attribute_id") REFERENCES "attribute" ("attribute_id") ON DELETE CASCADE,
  CONSTRAINT "FK_VARIANT_ATTRIBUTE_VALUE_OPTION" FOREIGN KEY ("option_id") REFERENCES "attribute_option" ("attribute_option_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_VARIANT_ATTRIBUTE_VALUE_ATTRIBUTE" ON "variant_attribute_value" ("attribute_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_VARIANT_ATTRIBUTE_VALUE_OPTION" ON "variant_attribute_value" ("option_id")`
  );

  // VARIANT_LOOKUP: resolves a selected combination of attribute options straight to a
  // variant_id via option_hash (a deterministic hash of that variant's sorted
  // attribute_id:option_id pairs), instead of joining variant_attribute_value per attribute
  await execute(
    connection,
    `CREATE TABLE "variant_lookup" (
  "variant_lookup_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "product_id" INT NOT NULL,
  "variant_id" INT NOT NULL,
  "option_hash" varchar NOT NULL,
  CONSTRAINT "VARIANT_LOOKUP_UNIQUE" UNIQUE ("product_id","option_hash"),
  CONSTRAINT "FK_VARIANT_LOOKUP_PRODUCT" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE,
  CONSTRAINT "FK_VARIANT_LOOKUP_VARIANT" FOREIGN KEY ("variant_id") REFERENCES "product_variant" ("product_variant_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_VARIANT_LOOKUP_VARIANT" ON "variant_lookup" ("variant_id")`
  );

  // INVENTORY_ITEM: capacity tracking per variant (replaces qty-on-product for the new model)
  await execute(
    connection,
    `CREATE TABLE "inventory_item" (
  "inventory_item_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "variant_id" INT NOT NULL,
  "total_seats" INT NOT NULL DEFAULT 0,
  CONSTRAINT "INVENTORY_ITEM_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "INVENTORY_ITEM_VARIANT_UNIQUE" UNIQUE ("variant_id"),
  CONSTRAINT "UNSIGNED_TOTAL_SEATS" CHECK(total_seats >= 0),
  CONSTRAINT "FK_INVENTORY_ITEM_VARIANT" FOREIGN KEY ("variant_id") REFERENCES "product_variant" ("product_variant_id") ON DELETE CASCADE
)`
  );

  // ATTRIBUTE_OPTION: add typed value columns alongside the existing option_text
  await execute(
    connection,
    `ALTER TABLE "attribute_option"
      ADD COLUMN IF NOT EXISTS "value_int" INT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "value_date" DATE DEFAULT NULL`
  );

  // product_category: re-add the many-to-many join dropped in Version-1.0.2.js.
  // product.category_id remains the single-category FK in active use; this table
  // is additive only and unused by existing code until a future cutover.
  await execute(
    connection,
    `CREATE TABLE "product_category" (
  "product_category_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "category_id" INT NOT NULL,
  "product_id" INT NOT NULL,
  CONSTRAINT "PRODUCT_CATEGORY_UNIQUE" UNIQUE ("category_id","product_id"),
  CONSTRAINT "FK_CATEGORY_PRODUCT_LINK" FOREIGN KEY ("category_id") REFERENCES "category" ("category_id") ON DELETE CASCADE,
  CONSTRAINT "FK_PRODUCT_CATEGORY_LINK" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_CATEGORY_PRODUCT_LINK" ON "product_category" ("category_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_PRODUCT_CATEGORY_LINK" ON "product_category" ("product_id")`
  );
};
