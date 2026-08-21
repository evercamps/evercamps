# Wire participants, registrations, and orders to product_variant

## Context

`feature/161-create-separate-variant-table` already merged the first migration: a WooCommerce
importer and the raw DB schema for a new per-product "variant" model — `product_variant`,
`variant_attribute_value`, `variant_lookup`, `inventory_item` (`core/modules/catalog/migration/Version-1.0.9.js`)
and `inventory_reservation` (`core/modules/oms/migration/Version-1.0.5.ts`). Confirmed by grep: **nothing
outside the WooCommerce importer touches these tables today** — no GraphQL, no admin UI, and
`cart_item`/`order_item`/`registration` still key entirely off the flat `product_id`/`product.sku`/`product.price`.

Target schema (from the provided ERD), already built:

```
PRODUCT ─┬─< PRODUCT_VARIANT >─< VARIANT_ATTRIBUTE_VALUE >─ ATTRIBUTE ─< ATTRIBUTE_OPTION
         │        │
         │        └─ INVENTORY_ITEM ─< INVENTORY_RESERVATION >─ ORDER
         └─< PRODUCT_IMAGE / CATEGORY (unchanged)
```

This plan is the **next step**: make `product_variant` the real source of truth for price/sku/title
and capacity, and thread `product_variant_id` through cart → order → registration, backend first,
then the minimal admin UI needed to see and pick a variant. **Storefront (customer-facing
add-to-cart/attribute picker) is explicitly out of scope** — deferred to a later PR. The
pre-existing, unrelated legacy `variant_group` (sibling-`product`-rows) mechanism is left untouched.

**Confirmed design decision:** `createProduct`/`updateProduct` will always ensure a product has at
least one `product_variant` (a "default variant" flagged `is_default`), so every downstream
consumer (cart, order, registration) can assume a variant is always resolvable — no dual-path
fallback logic scattered through checkout/camp code.

## Phase 1 — Catalog: default variant becomes real

**New migration `core/modules/catalog/migration/Version-1.0.10.js`** (additive — `Version-1.0.9.js`
already shipped and must not be edited):
- `ALTER TABLE product_variant ADD COLUMN is_default boolean NOT NULL DEFAULT false`
- `CREATE UNIQUE INDEX PRODUCT_VARIANT_ONE_DEFAULT ON product_variant(product_id) WHERE is_default = true`
  (partial unique index — DB-level guarantee of at most one default variant per product)
- **Backfill**: for every `product` with no `product_variant` row yet, insert one
  `{product_id, sku: product.sku, price: product.price, title: NULL, is_default: true}` plus a
  matching `inventory_item {variant_id, total_seats: product_inventory.qty ?? 0}`. Run as plain
  JS/SQL inside the migration function (migrations here are full async functions, not just DDL —
  see `Version-1.0.7.ts` for precedent of data backfill inside a migration).
- Verify: `SELECT count(*) FROM product WHERE product_id NOT IN (SELECT product_id FROM product_variant)` → 0 after running.

**`core/modules/catalog/services/product/createProduct.ts`**: after `insertProductInventory`, add
`ensureDefaultVariant(productData, product.insertId, connection)` — inserts the default
`product_variant` (`is_default: true`, `sku`/`price` mirrored from the product) + its `inventory_item`
(`total_seats` seeded from `productData.qty`).

**`core/modules/catalog/services/product/updateProduct.ts`**: add `syncDefaultVariant` — only when
the product currently has exactly one variant and it's flagged `is_default`, update that variant's
`sku`/`price` to match the product's new values, and update its `inventory_item.total_seats` from
the new qty. If the product has additional (real, non-default) variants — e.g. imported ones —
leave `product_variant` rows alone entirely; import/future variant-management UI owns them once
they exist.

**Catalog GraphQL surface** — new `core/modules/catalog/graphql/types/ProductVariant/{ProductVariant.graphql,ProductVariant.resolvers.ts}`:
```graphql
type ProductVariant {
  productVariantId: ID!
  uuid: String!
  sku: String!
  price: Price!
  title: String
  isDefault: Boolean!
  totalSeats: Int
}
extend type Product { variants: [ProductVariant!]! }
```
Resolver for `Product.variants`: `SELECT product_variant.*, inventory_item.total_seats FROM product_variant LEFT JOIN inventory_item ON ... WHERE product_id = :productId`. Reuse the existing shared
`Price` formatting resolver pattern already used by `Product.price` (don't invent a new one). This is
additive-only and is what the admin registration flow (Phase 5) queries.

## Phase 2 — Schema: thread `product_variant_id` through checkout & camp

**`core/modules/checkout/migration/Version-1.0.9.ts`**:
```sql
ALTER TABLE "cart_item" ADD COLUMN "product_variant_id" INT NULL
  REFERENCES "product_variant"("product_variant_id") ON DELETE SET NULL;
ALTER TABLE "order_item" ADD COLUMN "product_variant_id" INT NULL
  REFERENCES "product_variant"("product_variant_id") ON DELETE SET NULL;
CREATE INDEX ... ON cart_item(product_variant_id);
CREATE INDEX ... ON order_item(product_variant_id);
```
Nullable: historical rows predate variants, and it keeps rollback safe even though, practically,
every product has a resolvable default variant after Phase 1's backfill.

**`core/modules/camp/migration/Version-1.0.3.ts`**:
```sql
ALTER TABLE "registration" ADD COLUMN "registration_variant_id" INT NULL
  REFERENCES "product_variant"("product_variant_id") ON DELETE SET NULL;
```
`registration_product_id` **stays** (unchanged, still required) — kept for backward compat and
product-level filtering/display. Backfill existing rows: for each `registration` with a NULL
`registration_variant_id`, set it to that product's `is_default = true` variant.
⚠️ Verify module migration order (check `config/default.json` module list / migration runner) so
this backfill runs after catalog's Phase 1 backfill has populated default variants for every
product — if ordering can't be guaranteed, leave unresolved rows NULL (safe no-op) rather than
failing the migration.

## Phase 3 — Checkout wiring (cart → order → inventory)

- **`core/modules/checkout/services/addCartItem.ts`** / **`Cart.createItem`** (`core/modules/checkout/services/cart/Cart.ts`):
  add an optional `variantID` parameter, stored on the `Item` so field resolvers can read it.
- **New `core/modules/checkout/services/cart/fields/cartItem/variant.ts`**: a `product_variant_id`
  field resolver — if an explicit `variantID` was passed, validate it belongs to `product_id`;
  otherwise resolve the product's `is_default` variant via a new `cartItemVariantLoaderFunction`
  (registered in `core/modules/checkout/bootstrap.ts`, same pattern as the existing
  `cartItemProductLoaderFunction`).
- **`fields/cartItem/product.ts`**: `product_sku` now reads the resolved variant's `sku`;
  `product_name` becomes `variant.title ?? product.name` (variant title is only set for real,
  named variants; falls back to the product name for default variants). Thumbnail/weight/category
  stay product-level.
- **`fields/cartItem/pricing.ts`**: `product_price` now reads the resolved variant's `price`
  instead of `product.price`.
- **`fields/cartItem/inventory.ts`**: `qty` check moves from `product.qty`/`product.manage_stock`
  to the resolved variant's `inventory_item.total_seats` minus seats already committed via
  `inventory_reservation` for that `inventory_item` (available = total_seats − reserved). Keep the
  existing `manage_stock` flag (from `product_inventory`, still joined by `getProductsBaseQuery`)
  as the on/off gate for whether this check runs at all.
- **`saveCart.ts`**: confirm `cart_item` persistence writes off `item.export()` dynamically (add
  `product_variant_id` explicitly if the column list is hardcoded instead).
- **`orderCreator.ts` `saveOrderItems`**: `order_item` already copies `item.export()` wholesale, so
  `product_variant_id` flows through automatically once cart_item carries it. In the existing
  registrations loop (~line 176), add `registration_variant_id: item.getData('product_variant_id')`
  alongside the existing `registration_product_id`.
- **New step after order items are saved**: for each order item with a resolved variant, insert an
  `inventory_reservation {inventory_item_id, order_id, seats_held: qty, expires_at: NULL}` — a
  committed, non-expiring hold representing this order's seats. (No cart-time hold/expiry concept
  exists yet — out of scope; note as a future follow-up.)
- **`reduce_product_stock_when_order_placed` trigger**: leave untouched for this PR (still
  decrements `product_inventory.qty` for legacy display). Capacity *enforcement* now reads from
  `inventory_item`/`inventory_reservation` instead — flag the trigger as a cleanup candidate once
  the new path is proven, not something to change now (lower risk).

## Phase 4 — Registration service & GraphQL

- **`registrationDataSchema.json`** / **`createRegistration.ts`**: accept an optional
  `registration_variant_id`; if omitted, resolve it server-side from `registration_product_id`'s
  default variant (keeps any other existing callers working unmodified). Note: the existing
  duplicate-registration guard checks `(participant, product)` — confirm with product owner during
  implementation whether it should become `(participant, variant)` instead, since a participant
  legitimately registering for two different sessions/weeks (two variants of the same product)
  should probably be allowed. Default to keeping `(participant, product)` unless told otherwise.
- **`getRegistrationsBaseQuery.ts`** + **`getRegistrationsByParticipantBaseQuery.ts`**: add
  `LEFT JOIN product_variant ON registration.registration_variant_id = product_variant.product_variant_id`,
  selecting `product_variant.product_variant_id`, `.sku AS variant_sku`, `.title AS variant_title`,
  `.price AS variant_price`.
- **`Registration.graphql`**: add `variantId: Int`, `variantSku: String`, `variantTitle: String`,
  `variantPrice: Price`. No new resolver code needed — the base query's camelCased columns
  auto-map (confirmed pattern: `camelCase(row)` in `Registration.resolvers.ts`).

## Phase 5 — Admin UI

- **`core/components/admin/camp/participantEdit/AddRegistrations.tsx`**: after a product is picked
  via the existing (unchanged) `RegistrationSkuSelector`, query that product's `variants` (Phase 1's
  GraphQL). If exactly one, auto-select it and POST as today (no UX change for simple products). If
  more than one, show an inline variant picker (title/sku/price) before POSTing
  `{registration_product_id, registration_participant_id, registration_variant_id}`.
  `RegistrationSkuSelector.jsx` itself is **not modified** — it's shared with the promotions
  coupon-product picker, which has nothing to do with variants.
- **`registrationGrid/Grid.tsx`** and **`participantEdit/Registrations.tsx`**: show
  `variantTitle` next to the product name when present (safe no-op for default/simple variants
  where `title` is null).
- **`core/modules/oms/graphql/types/Order/Order.graphql`** + **`Order.resolvers.ts`**: add
  `productVariantId: Int`, `variantTitle: String` to `OrderItem` (resolver joins `product_variant`
  by `productVariantId` when present).
- **`core/modules/oms/pages/admin/orderEdit/Items.tsx`**: render `variantTitle` under the product
  name, alongside/replacing the legacy `variantOptions` text for variant-bearing items.

## Rollout order

1. Phase 1 migration (`Version-1.0.10.js`) — additive, no code depends on it yet.
2. `createProduct`/`updateProduct` default-variant wiring + ProductVariant GraphQL — additive.
3. Phase 2 migrations (checkout `Version-1.0.9.ts`, camp `Version-1.0.3.ts`) — additive, nullable.
4. Phase 3 checkout service wiring — the first *behavior-changing* step (changes what price/sku a
   cart item resolves to); test thoroughly before/after.
5. Phase 4 registration service + GraphQL.
6. Phase 5 admin UI — last, once the data it displays actually exists.

## Verification

- After Phase 1: `SELECT count(*) FROM product p LEFT JOIN product_variant v ON v.product_id = p.product_id WHERE v.product_variant_id IS NULL` → 0.
- Create a new product via admin → confirm (SQL) a `product_variant` (`is_default=true`) + `inventory_item` row was created automatically.
- Add that product to cart (existing storefront flow, no UI change needed) → confirm `cart_item.product_variant_id` is populated.
- Place the order → confirm `order_item.product_variant_id` is populated, an `inventory_reservation` row exists with correct `seats_held`, and (if the item had registrations) the new `registration.registration_variant_id` is set.
- In admin, use "Add Registration" against a WooCommerce-imported product with genuine multiple variants → confirm the variant picker appears in `AddRegistrations.tsx` and the resulting registration/grid/order views show the chosen variant, not just the product.
- Regression: open pre-migration orders/registrations in admin and confirm they still render correctly (NULL/backfilled-default variant fields must degrade gracefully to today's product-only display).
