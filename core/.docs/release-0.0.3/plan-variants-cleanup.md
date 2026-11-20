# Variants cleanup: remove `variant_group`, attribute roles, attribute group lock and admin page

## Context

From `planning.md` (release 0.0.3, tasks). This plan follows up on
`release-0.0.2/analysis-attribute-groups.md`. We grilled the decisions in a session on 2026-11-20 and
recorded them as ADRs:

- [ADR-0001](../../../docs/adr/0001-diverge-from-evershop.md): evercamps diverges from EverShop, so
  core migrations and triggers may change.
- [ADR-0002](../../../docs/adr/0002-product-variant-is-the-only-variant-model.md): `product_variant`
  is the only variant model. The legacy `variant_group` goes away completely.
- [ADR-0003](../../../docs/adr/0003-attribute-groups-are-product-kinds-locked-by-variants.md):
  attribute groups stay as product kinds. They get their own admin page and are locked once variants
  use them.
- [ADR-0004](../../../docs/adr/0004-attributes-have-a-fixed-role.md): each attribute has one fixed
  role, `product` or `variant`.

Words follow `GLOSSARY.md` (Product, Variant, Variant attribute, Product attribute, Attribute group).

**Facts checked:** `SELECT count(*) FROM variant_group` and
`SELECT count(*) FROM product WHERE variant_group_id IS NOT NULL` both return 0. We are not live, so
the data model can change without converting data.

All paths are relative to `core/` unless stated otherwise. The latest catalog migration is
`modules/catalog/migration/Version-1.1.5.ts`, so this work adds **`Version-1.1.6.ts`**.

The work is split into two stages, each delivered as one branch and PR. Stage 2 needs stage 1.

---

## Stage 1: data model and backend

Branch: `feature/variants-cleanup-backend`

### 1.1 Migration `Version-1.1.6.ts`

Run everything in one transaction. Order matters because of FKs and triggers.

1. **Drop legacy triggers and functions that use `variant_group`**
   (definitions in `Version-1.0.0.ts:496-650` and `Version-1.0.1.ts:11-33`):
   - `PREVENT_CHANGING_ATTRIBUTE_GROUP_OF_PRODUCT_WITH_VARIANTS` + `prevent_change_attribute_group()`
     (replaced in step 5).
   - `TRIGGER_AFTER_INSERT_PRODUCT` + `update_variant_group_visibility()`.
   - `TRIGGER_AFTER_UPDATE_ATTRIBUTE` + `delete_variant_group_after_attribute_type_changed()`.
   - Redefine `remove_attribute_from_group()` **without** the `DELETE FROM variant_group` line. Keep
     the delete of product values for now; step 6 adds the variant guard.
   - Redefine `update_attribute_index_and_variant_group_visibility()` without the `UPDATE "variant_group"`
     line, and rename it to `update_attribute_index_after_product_update()`. Recreate
     `TRIGGER_PRODUCT_AFTER_UPDATE` on it. It keeps deleting product attribute values outside the
     product's group. That is fine now because of the lock in step 5.
2. **Drop `variant_group`**: FK `FK_PRODUCT_VARIANT_GROUP`, index `FK_PRODUCT_VARIANT_GROUP`, column
   `product.variant_group_id`, then table `variant_group`. Also check `modules/checkout/migration/Version-1.0.0.ts`
   for a `variant_group_id` on `cart_item` and drop it if it exists.
3. **Add attribute role**: `ALTER TABLE attribute ADD COLUMN role varchar NOT NULL DEFAULT 'product'`
   with `CHECK (role IN ('product','variant'))`, plus
   `CHECK (role = 'product' OR type IN ('select','period'))`.
4. **Backfill role**: `UPDATE attribute SET role = 'variant' WHERE attribute_id IN (SELECT DISTINCT attribute_id FROM variant_attribute_value)`.
   Then delete product-level values of variant attributes:
   `DELETE FROM product_attribute_value_index WHERE attribute_id IN (SELECT attribute_id FROM attribute WHERE role = 'variant')`.
5. **Attribute group lock** (ADR-0003): a new `BEFORE UPDATE OF group_id ON product` trigger
   `PREVENT_CHANGING_ATTRIBUTE_GROUP_OF_PRODUCT_WITH_VARIANT_VALUES`. It raises an exception when
   `OLD.group_id IS DISTINCT FROM NEW.group_id` and
   `EXISTS (SELECT 1 FROM variant_attribute_value vav JOIN product_variant pv ON pv.product_variant_id = vav.variant_id WHERE pv.product_id = NEW.product_id)`.
   Check the real column names in `Version-1.0.9.js`.
6. **Guard removing a variant attribute from a group**: `BEFORE DELETE ON attribute_group_link`.
   It raises when the attribute has role `variant` and a `variant_attribute_value` row exists for a
   variant of a product with `group_id = OLD.group_id`.
7. **Guard deleting a group with products**: change FK `product.group_id` from `ON DELETE SET NULL`
   to `ON DELETE RESTRICT`. Keep `PREVENT_DELETING_THE_DEFAULT_ATTRIBUTE_GROUP`.
8. **Role lock** (ADR-0004): `BEFORE UPDATE OF role ON attribute`. It raises when the role changes
   and the attribute has rows in `variant_attribute_value` or `product_attribute_value_index`.

Return clear exception messages, because the API maps them to admin errors
(e.g. `ATTRIBUTE_GROUP_LOCKED: variants use week, age`).

### 1.2 Remove legacy `variant_group` code (ADR-0002)

| Remove / change | Where |
|---|---|
| API routes `createVariantGroup`, `addVariantItem`, `unlinkVariant`, `variantSearch` (folders + entries) | `modules/catalog/api/*`, `modules/catalog/api/routes.ts` |
| Sibling handling when adding/removing a product to/from a collection | `api/addProductToCollection/addProducts.ts:34,80-83`, `api/removeProductFromCollection/removeProducts.ts:25,69-72` |
| GraphQL `Product.variantGroupId`, `variantGroup`, type `VariantGroup`, its resolvers | `graphql/types/Product/Product.graphql:17`, `graphql/types/Product/Variant/*` (delete the folder if nothing else is left) |
| Cart/order `variantGroupId` | `modules/checkout/graphql/types/Cart/Cart.graphql`, `modules/oms/graphql/types/Order/Order.graphql`, `modules/checkout/services/cart/fields/cartItem/product.ts` |
| Cart item variant options built from `variant_group` | `services/registerCartItemVariantOptionsField.ts`: rebuild it from `variant_attribute_value` of the cart item's `product_variant_id`, or delete it if the cart already shows variant options another way |
| Storefront `?attr=value` sibling lookup | `pages/frontStore/productView/index.ts:48-100` |
| Sibling sync on product save | `services/product/updateProduct.ts:177-226, 318-337` |
| Product grid filter `type = simple/configurable` | `services/registerDefaultProductCollectionFilters.ts:195-220`, `services/ProductCollection.ts`. Remove it, or redefine it as "has more than one variant" if the grid uses it |
| Attribute delete guard on variant groups | `services/attribute/deleteProductAttribute.ts:32-45`. Replace it with "is used in `variant_attribute_value`" |
| Seed data `variant_group_id: null` | `migration/Version-1.0.4.ts` (old migration: leave it alone, because it only runs on fresh installs **before** 1.1.6 drops the column) |
| Dead admin components | `components/admin/catalog/productEdit/variants/*` (whole folder, after a grep shows no imports) |

Afterwards, `grep -ri "variant_group\|variantGroup"` outside `migration/` must return nothing.

### 1.3 Attribute role in services and GraphQL (ADR-0004)

- `services/attribute/createProductAttribute.ts` / `updateProductAttribute.ts`: accept `role`, and
  reject `variant` for types other than `select`/`period`. Payload schemas of the attribute API routes
  get `role`.
- GraphQL `Attribute.role` (admin type in `graphql/types/Attribute/Attribute.admin.graphql`).
- `graphql/types/ProductVariant/ProductVariant.admin.resolvers.ts:63-105` (`Product.variantAttributes`):
  return attributes with `role = 'variant'` that are in the product's group, plus attributes its
  variants already use (keep that safety net).
- `services/product/productVariants.ts:87-130` (`writeOptions`): reject an attribute that isn't
  `role = 'variant'` or isn't in the product's group.
- Product save (`services/product/updateProduct.ts` / `createProduct.ts`): ignore or reject values for
  `variant` attributes in `attributes[]`.
- Add `Product.attributeGroupLocked: Boolean` and `Product.attributeGroupLockReason: String` (the
  variant attributes in use) for the UI.

### 1.4 WooCommerce importer

- `content/plugins/woocommerce-import/src/lib/importVariants.ts:47-62`: insert with `role: 'variant'`.
  If the attribute already exists with role `product`, set it to `variant` (or report a clear error
  if it already has product values).
- `mapProduct.ts:40` keeps `group_id = 1`.

### 1.5 Tests (stage 1)

- Migration on a DB with demo data and imported products: roles are backfilled correctly, and
  `variant_group` and `product.variant_group_id` are gone.
- Changing `group_id` fails for a product whose variant has an attribute value, and succeeds for a
  product with only a default variant that has no values.
- Deleting a group that still has products fails. Deleting group 1 fails.
- Removing a variant attribute that is in use from a group fails. Removing a product attribute
  succeeds and deletes its values.
- Changing the role of an attribute that has values fails.
- `writeOptions` rejects product attributes and attributes outside the group.
- Cart, checkout and order still work end to end (camp registration flow).

---

## Stage 2: admin UI

Branch: `feature/attribute-groups-admin`

### 2.1 Attribute groups admin page (ADR-0003)

- New pages `attributeGroupGrid` and `attributeGroupEdit+attributeGroupNew` under
  `modules/catalog/pages/admin/`. Add a menu entry next to "Attributes".
- The grid shows name, number of attributes and number of products. Delete is disabled with a
  tooltip when the group has products or is group 1.
- The edit page has the name, plus two lists: **Product attributes** and **Variant attributes**
  (picked from all attributes of that role). When you remove a product attribute, a confirmation
  says how many product values will be deleted. When you remove a variant attribute that is in use,
  the error from the DB guard is shown.
- Use the existing routes `createAttributeGroup`, `updateAttributeGroup` and `deleteAttributeGroup`.
  Extend `updateAttributeGroup` to accept the attribute list, and add a count endpoint or GraphQL
  field for the confirmation. Check that `saveGroup` runs after `auth`
  (`api/routes.ts:178,364` are ordered only after `bodyParser`; see the analysis §2.3).

### 2.2 Attribute edit page

- `pages/admin/attributeEdit+attributeNew/General.tsx:66-147,365-370,379`: remove the "Create a new
  group" input and the `+` link. Keep a plain multi-select of existing groups. New attributes default
  to group 1 (`createProductAttribute.ts:32-38` requires `groups`).
- Add a **Role** field (Product / Variant). Show it only for `select` and `period`. Make it read-only
  with the reason when the attribute has values.
- Attribute grid (`pages/admin/attributeGrid/Grid.tsx`): add a Role column and filter.

### 2.3 Product edit page

- `pages/admin/productEdit+productNew/Attributes.tsx`:
  - Show only attributes with `role = 'product'`. This removes the variant dropdown from the product.
  - The group dropdown is read-only when `attributeGroupLocked`, and shows the reason
    ("Locked because variants use week, age").
  - When the group changes while unlocked, warn that product attribute values outside the new group
    will be removed when you save.
- `pages/admin/productEdit/Variants.tsx:559-575`: replace the "Change it in the Attributes card" help
  text with the group name and its lock state.

### 2.4 Tests (stage 2)

- Create, rename and delete a group. Delete is blocked when the group has products.
- Add and remove attributes on a group. Check the confirmation, and the error for a variant attribute
  that is in use.
- The product page doesn't show variant attributes. The group dropdown is locked after you add a
  variant with options.
- The Variants form only offers variant attributes of the product's group.

---

## Out of scope

- Coupon "attribute group" conditions and targets stay unchanged (ADR-0003).
- Storefront variant picker: it already uses `bookableVariants`, so nothing changes apart from the
  removal of the `?attr=` lookup.
- `is_default` / default variant work from `releases-0.x/variation-plan.md`.
