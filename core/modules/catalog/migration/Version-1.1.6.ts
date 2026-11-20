import { execute } from '@evershop/postgres-query-builder';

// Variants cleanup (issue #189):
// - ADR-0002: remove the legacy EverShop variant_group (sibling products).
// - ADR-0004: every attribute has one fixed role, 'product' or 'variant'.
// - ADR-0003: a product's attribute group is locked once its variants use a
//   variant attribute; groups with products can't be deleted; a variant
//   attribute in use can't be removed from its group.
export default async (connection: any) => {
  /* 1. Drop the triggers and functions that only existed for variant_group */
  await execute(connection, `DROP TRIGGER IF EXISTS "PREVENT_CHANGING_ATTRIBUTE_GROUP_OF_PRODUCT_WITH_VARIANTS" ON "product"`);
  await execute(connection, `DROP FUNCTION IF EXISTS prevent_change_attribute_group()`);
  await execute(connection, `DROP TRIGGER IF EXISTS "TRIGGER_AFTER_INSERT_PRODUCT" ON "product"`);
  await execute(connection, `DROP FUNCTION IF EXISTS update_variant_group_visibility()`);
  await execute(connection, `DROP TRIGGER IF EXISTS "TRIGGER_AFTER_UPDATE_ATTRIBUTE" ON "attribute"`);
  await execute(connection, `DROP FUNCTION IF EXISTS delete_variant_group_after_attribute_type_changed()`);

  // Removing an attribute from a group still deletes its product values for the
  // products in that group, but no longer touches variant_group.
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION remove_attribute_from_group()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        DELETE FROM product_attribute_value_index
        WHERE product_attribute_value_index.attribute_id = OLD.attribute_id
          AND product_attribute_value_index.product_id IN (SELECT product.product_id FROM product WHERE product.group_id = OLD.group_id);
        RETURN OLD;
      END;
      $$;`
  );

  // After a product update: delete product attribute values outside the
  // product's group (same as before, without the variant_group visibility).
  await execute(connection, `DROP TRIGGER IF EXISTS "TRIGGER_PRODUCT_AFTER_UPDATE" ON "product"`);
  await execute(connection, `DROP FUNCTION IF EXISTS update_attribute_index_and_variant_group_visibility()`);
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION update_attribute_index_after_product_update()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        DELETE FROM "product_attribute_value_index"
        WHERE "product_attribute_value_index"."product_id" = NEW.product_id
          AND "product_attribute_value_index"."attribute_id" NOT IN (
            SELECT "attribute_group_link"."attribute_id" FROM "attribute_group_link"
            WHERE "attribute_group_link"."group_id" = NEW.group_id
          );
        RETURN NEW;
      END;
      $$;`
  );
  await execute(
    connection,
    `CREATE CONSTRAINT TRIGGER "TRIGGER_PRODUCT_AFTER_UPDATE" AFTER UPDATE ON "product"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE PROCEDURE update_attribute_index_after_product_update();`
  );

  /* 2. Drop variant_group itself */
  await execute(connection, `ALTER TABLE "product" DROP CONSTRAINT IF EXISTS "FK_PRODUCT_VARIANT_GROUP"`);
  await execute(connection, `DROP INDEX IF EXISTS "FK_PRODUCT_VARIANT_GROUP"`);
  await execute(connection, `ALTER TABLE "product" DROP COLUMN IF EXISTS "variant_group_id"`);
  await execute(connection, `DROP TABLE IF EXISTS "variant_group"`);

  /* 3. Attribute role */
  await execute(
    connection,
    `ALTER TABLE "attribute"
      ADD COLUMN "role" varchar NOT NULL DEFAULT 'product',
      ADD CONSTRAINT "ATTRIBUTE_ROLE_VALID" CHECK ("role" IN ('product', 'variant')),
      ADD CONSTRAINT "ATTRIBUTE_VARIANT_ROLE_TYPE" CHECK ("role" = 'product' OR "type" IN ('select', 'period'))`
  );

  /* 4. Backfill: attributes used by variants are variant attributes. Their
     product-level values (if any) are dropped: a variant attribute is never
     filled in on the product itself. */
  await execute(
    connection,
    `UPDATE "attribute" SET "role" = 'variant'
     WHERE "attribute_id" IN (SELECT DISTINCT "attribute_id" FROM "variant_attribute_value")
       AND "type" IN ('select', 'period')`
  );
  await execute(
    connection,
    `DELETE FROM "product_attribute_value_index"
     WHERE "attribute_id" IN (SELECT "attribute_id" FROM "attribute" WHERE "role" = 'variant')`
  );

  /* 5. Attribute group lock: no group change once a variant has a value for
     a variant attribute. */
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION prevent_change_attribute_group_with_variant_values()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS
      $$
      DECLARE
        used_attributes text;
      BEGIN
        IF OLD.group_id IS DISTINCT FROM NEW.group_id THEN
          SELECT string_agg(DISTINCT a.attribute_name, ', ' ORDER BY a.attribute_name) INTO used_attributes
          FROM variant_attribute_value vav
          JOIN product_variant pv ON pv.product_variant_id = vav.variant_id
          JOIN attribute a ON a.attribute_id = vav.attribute_id
          WHERE pv.product_id = NEW.product_id AND vav.option_id IS NOT NULL;
          IF used_attributes IS NOT NULL THEN
            RAISE EXCEPTION 'ATTRIBUTE_GROUP_LOCKED: Variants use %', used_attributes;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$;`
  );
  await execute(
    connection,
    `CREATE TRIGGER "PREVENT_CHANGING_ATTRIBUTE_GROUP_OF_PRODUCT_WITH_VARIANT_VALUES"
        BEFORE UPDATE OF "group_id" ON "product"
        FOR EACH ROW
        EXECUTE PROCEDURE prevent_change_attribute_group_with_variant_values();`
  );

  /* 6. A variant attribute in use can't be removed from its group */
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION prevent_remove_used_variant_attribute_from_group()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM variant_attribute_value vav
          JOIN product_variant pv ON pv.product_variant_id = vav.variant_id
          JOIN product p ON p.product_id = pv.product_id
          WHERE vav.attribute_id = OLD.attribute_id
            AND vav.option_id IS NOT NULL
            AND p.group_id = OLD.group_id
        ) THEN
          RAISE EXCEPTION 'VARIANT_ATTRIBUTE_IN_USE: variants in this attribute group use this attribute';
        END IF;
        RETURN OLD;
      END;
      $$;`
  );
  await execute(
    connection,
    `CREATE TRIGGER "PREVENT_REMOVING_USED_VARIANT_ATTRIBUTE_FROM_GROUP"
        BEFORE DELETE ON "attribute_group_link"
        FOR EACH ROW
        EXECUTE PROCEDURE prevent_remove_used_variant_attribute_from_group();`
  );

  /* 7. A group with products can't be deleted (was ON DELETE SET NULL) */
  await execute(connection, `ALTER TABLE "product" DROP CONSTRAINT IF EXISTS "FK_PRODUCT_ATTRIBUTE_GROUP"`);
  await execute(
    connection,
    `ALTER TABLE "product" ADD CONSTRAINT "FK_PRODUCT_ATTRIBUTE_GROUP"
      FOREIGN KEY ("group_id") REFERENCES "attribute_group" ("attribute_group_id") ON DELETE RESTRICT`
  );

  /* 8. Role lock: the role can't change once the attribute has values */
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION prevent_change_attribute_role_with_values()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        IF OLD.role IS DISTINCT FROM NEW.role AND (
          EXISTS (SELECT 1 FROM variant_attribute_value WHERE attribute_id = OLD.attribute_id AND option_id IS NOT NULL)
          OR EXISTS (SELECT 1 FROM product_attribute_value_index WHERE attribute_id = OLD.attribute_id)
        ) THEN
          RAISE EXCEPTION 'ATTRIBUTE_ROLE_LOCKED: attribute % already has values', OLD.attribute_code;
        END IF;
        RETURN NEW;
      END;
      $$;`
  );
  await execute(
    connection,
    `CREATE TRIGGER "PREVENT_CHANGING_ATTRIBUTE_ROLE_WITH_VALUES"
        BEFORE UPDATE OF "role" ON "attribute"
        FOR EACH ROW
        EXECUTE PROCEDURE prevent_change_attribute_role_with_values();`
  );
};
