# Import WooCommerce Product Variations

## Context

The WooCommerce import plugin (`content/plugins/woocommerce-import/`, see `wordpress-import.md`)
currently imports simple products only. `lib/mapProduct.ts` hardcodes `group_id = 1`
(`DEFAULT_ATTRIBUTE_GROUP_ID`) for every product because, per that file's own comment, "WC
attributes aren't mapped to evercamps' attribute system in v1." A WooCommerce **variable**
product (e.g. a T-shirt with Color/Size options) is currently imported as one flat product using
the parent's own (often blank/zero) price and SKU, and its variations — each with its own SKU,
price, and stock — are never fetched at all.

Goal: fetch each variable product's variations via `GET /products/<id>/variations` (a per-product
HTTP request, same shape as the existing per-product `resolveProductImages` extra-fetch pattern
in `lib/importImages.ts`), transform them, and store them wired into evercamps' **native variant
system** — the same mechanism the admin "Create variant group" / "Add variant item" UI already
builds (`variant_group` table + `product.variant_group_id` + `product_attribute_value_index`; see
`core/modules/catalog/api/createVariantGroup` and `api/addVariantItem`). This requires a new step
the plugin doesn't have yet: mapping WooCommerce's per-product attributes (e.g. "Color") into
evercamps' `attribute` / `attribute_option` / `attribute_group` rows on the fly, since nothing in
evercamps' native attribute system is WooCommerce-aware today.

**Key design decision.** evercamps has no "parent product" concept — a variant family is just N
independent `product` rows sharing one `variant_group_id`. So when a WooCommerce product is
`type: 'variable'` and has ≥1 variations, the import **skips** creating a standalone product row
for the WC parent (it has no real SKU/sellable price anyway) and instead imports each variation as
its own full product row, using the parent's name/description/images as shared defaults. A
variable product with zero variations still imports as today (simple product), so nothing is
silently dropped.

All facts below (file paths, line numbers, function signatures, schema fields) were confirmed by
reading the current code, not assumed.

## New mapping concepts this feature introduces

1. **Attribute mapping** — a stable `attribute_code` derived from a slug of the WC attribute name
   (e.g. `wc_attr_color`), so "Color" is created once and reused across products/runs.
2. **Attribute option mapping** — options (e.g. "Red") are looked up by
   `(attribute_id, option_text)` before insert, to avoid duplicates on re-import.
3. **Attribute group reuse** — one `attribute_group` per *unique set* of variation attribute codes
   (e.g. `{color,size}`), tracked in a new map table, so two unrelated products that both use
   Color+Size share one group instead of minting a new one each time.
4. **Variant group** — one `variant_group` per WC *parent* product (its family of variations),
   created once and reused on re-import via the new variation map table.

## Files to add

- `content/plugins/woocommerce-import/src/lib/woocommerceClient.ts` — add
  `fetchProductVariations(client, productId, perPage = 50)`, an async generator identical in shape
  to `fetchAllProducts`/`fetchAllOrders` (L24-64 today), hitting `/products/<productId>/variations`.
- `content/plugins/woocommerce-import/src/lib/importAttributes.ts` (new) —
  `resolveVariationAttributeContext(wcProduct)`:
  - Filters `wcProduct.attributes` to `variation === true`.
  - For each, find-or-create an `attribute` row: `select().from('attribute').where('attribute_code','=',code)`,
    else call `createProductAttribute` (`core/modules/catalog/services/attribute/createProductAttribute.ts:158`,
    re-exported through `core.ts`) with
    `{attribute_code, attribute_name: name, type: 'select', is_required: false, display_on_frontend: true, groups: [], options: options.map(o => ({option_text: o}))}`.
  - For an attribute that already exists, find any option texts on this product not yet present
    (`select().from('attribute_option').where('attribute_id','=',id)`) and `insert()` the missing
    ones directly via `@evershop/postgres-query-builder` — no service exists for "add an option to
    an existing attribute" (confirmed: `insertAttributeOptions` in `createProductAttribute.ts:72-99`
    only runs at attribute-creation time and blindly inserts, so it can't be reused for
    incremental option discovery without a pre-check).
  - Resolves/creates the shared `attribute_group` for the sorted code set via a new
    `woocommerce_attribute_group_map` table (`attribute_set_key` UNIQUE → `attribute_group_id`); on
    a miss, `insert('attribute_group').given({group_name})`, then link each attribute via
    `insertOnUpdate('attribute_group_link', ['attribute_id','group_id'])` (mirrors
    `createProductAttribute.ts:53-70`).
  - Returns `{ attributeGroupId, attributeIds: number[] (max 5, stable order), codeByWcAttributeId, optionIdByWcAttributeIdAndValue }`.
- `content/plugins/woocommerce-import/src/lib/mapVariation.ts` (new) —
  `mapVariation(parentProduct, wcVariation, attributeContext) → ProductImportData`, mirroring
  `mapProduct.ts`'s SKU/price/qty/stock/status/weight logic, but:
  - `sku`: the variation's own SKU, else `wc_variation_<id>`.
  - `price`: the variation's `regular_price`/`price`, falling back to the parent's price if blank.
  - `name`: `` `${parentProduct.name} - ${optionValues.join(', ')}` ``.
  - `url_key`: `` `${parentSlug}-${wcVariation.id}` `` — guarantees uniqueness without depending on
    a variation slug, which WooCommerce doesn't provide.
  - `group_id`: `attributeContext.attributeGroupId`, not the default group.
  - `attributes`: `[{attribute_code, value: String(optionId)}]`, built from `wcVariation.attributes`
    via the `attributeContext` maps — this is what makes `createProduct`/`updateProduct` populate
    `product_attribute_value_index` automatically (`createProduct.ts:58-160`, `updateProduct.ts:175`);
    no manual index writes are needed.
- `content/plugins/woocommerce-import/src/lib/runVariationImport.ts` (new) —
  `importVariationsForProduct(client, wcProduct, attributeContext, batchId)`:
  - Fetches all variation pages via `fetchProductVariations`.
  - Resolves/creates this parent's `variant_group_id`: looks up any existing
    `woocommerce_variation_map` row for `external_parent_product_id`; else
    `insert('variant_group').given({attribute_group_id, attribute_one: ids[0] ?? null, ...})`
    (shape mirrors `createVariantGroup/[bodyParser]saveGroup.js:99`).
  - For each variation: `mapVariation`, resolve its image via the existing
    `resolveProductImages(wcVariation.id, wcVariation.image ? [wcVariation.image] : [])` (falling
    back to the parent's already-resolved images if the variation has none), then create-or-update
    exactly like `runImport.ts`'s per-product block — additionally setting
    `product.variant_group_id` after create
    (`update('product').given({variant_group_id}).where('product_id','=',...)`, mirroring
    `addVariantItem/[bodyParser]addItem.js:57-62`), and re-asserting it after update for
    idempotency. Each variation is wrapped in its own try/catch so one bad variation can't fail its
    siblings or the parent product loop.
  - Uses the new tracking functions in `services/importBatch.ts` (below) so re-imports are
    idempotent and per-variation failures are recorded individually.
- `content/plugins/woocommerce-import/src/migration/Version-1.0.3.ts` (new) — adds:
  - `woocommerce_variation_map` (mirrors `woocommerce_product_map` in `Version-1.0.0.ts:24-38`):
    `woocommerce_variation_map_id`, `uuid`, `external_parent_product_id`,
    `external_variation_id` (UNIQUE), `product_id` (FK `product`, `ON DELETE CASCADE`),
    `variant_group_id` (FK `variant_group`), `created_in_batch_id` / `last_batch_id` (FK
    `woocommerce_import_batch`), `status`, `error_message`, `external_updated_at`, timestamps.
  - `woocommerce_attribute_group_map`: `woocommerce_attribute_group_map_id`, `attribute_set_key`
    (UNIQUE text — sorted, comma-joined attribute codes), `attribute_group_id` (FK
    `attribute_group`).

## Files to change

- `content/plugins/woocommerce-import/src/types.ts` — extend `WooCommerceProduct` with
  `type: string` and `attributes: WooCommerceProductAttribute[]`; add
  `WooCommerceProductAttribute { id, name, variation: boolean, options: string[] }`,
  `WooCommerceVariationAttribute { id, name, option }`,
  `WooCommerceProductVariation { id, sku, regular_price, price, stock_quantity, manage_stock, stock_status, weight, date_modified, image?: WooCommerceProductImage, attributes: WooCommerceVariationAttribute[] }`.
- `content/plugins/woocommerce-import/src/lib/runImport.ts` — inside the per-product loop
  (currently L35-85): if `wcProduct.type === 'variable'`, fetch variations first; if any exist,
  resolve the attribute context and call `importVariationsForProduct(...)` **instead of** the
  existing `createProduct`/`updateProduct` call for the parent, then continue to the next product.
  A variable product with zero variations falls through to today's simple-product path unchanged.
  Variation create/update/failure counts fold into the existing `totalCreated`/`totalUpdated`/
  `totalFailed` counters — no `woocommerce_import_batch` schema change needed.
- `content/plugins/woocommerce-import/src/services/importBatch.ts` — add
  `findVariationMapByExternalId`, `findVariantGroupIdForParent(externalParentProductId)`,
  `recordVariationCreated`, `recordVariationUpdated`, `recordVariationFailed`, mirroring the
  existing product-map functions (currently L42-123) exactly. Extend `rollbackProductBatch`
  (currently L175-199) to also delete variation products/map rows created in the batch — leave
  shared `attribute`/`attribute_group`/`variant_group` rows in place, since they may be reused by
  other product families; an orphaned `variant_group` after a full rollback is harmless because
  `product.variant_group_id` has `ON DELETE SET NULL`.
- `content/plugins/woocommerce-import/src/core.ts` — add
  `export { default as createProductAttribute } from '../../../../dist/modules/catalog/services/attribute/createProductAttribute.js';`.

## Known limitations (documented, not solved in v1)

- If a WooCommerce attribute set changes between import runs (e.g. a "Material" attribute is added
  later), the existing `variant_group`'s fixed `attribute_one..five` won't pick it up — re-importing
  won't retrofit it. Flagged as a follow-up, not solved here.
- If a product was previously imported as simple and later becomes variable in WooCommerce, the
  old simple product row is left orphaned rather than auto-migrated; rollback + reimport is the
  escape hatch.

## Non-goals for v1 (explicitly deferred)

- Retrofitting variant_group attribute sets after creation (see limitations above).
- Splitting variation counts out of the batch summary's existing created/updated/failed totals
  into their own columns — v1 folds them together.
- A settings toggle to disable variation import — v1 always imports variations for variable
  products that have any.

## Verification

- Unit tests: `content/plugins/woocommerce-import/tests/unit/mapVariation.test.ts` and
  `importAttributes.test.ts`, following the plain `describe/it` convention used at
  `core/modules/checkout/tests/unit/lineTotal.test.js`.
- Manual, against a WooCommerce store with at least one variable product:
  1. Run the existing `POST /wc-import/products` route.
  2. In evercamps admin, confirm: variation products exist with correct SKU/price/stock, the
     parent variable product's own row was **not** created, and the product edit page's variant
     group UI shows the swatches with the correct options selected.
  3. Re-run the import and confirm no duplicate attributes, options, attribute groups, or variant
     groups are created (idempotency).

## Critical files

- `content/plugins/woocommerce-import/src/lib/runImport.ts` — where the variable-product branch
  is added
- `content/plugins/woocommerce-import/src/lib/runVariationImport.ts` — new, the variation import
  loop
- `content/plugins/woocommerce-import/src/lib/importAttributes.ts` — new, WC attribute → evercamps
  attribute/attribute_group mapping
- `content/plugins/woocommerce-import/src/lib/mapVariation.ts` — new, field mapping for a single
  variation
- `content/plugins/woocommerce-import/src/migration/Version-1.0.3.ts` — new tables
- `content/plugins/woocommerce-import/src/services/importBatch.ts` — new tracking functions +
  rollback extension
- `core/modules/catalog/services/attribute/createProductAttribute.ts` — reused as-is, not modified
- `core/modules/catalog/services/product/{createProduct,updateProduct}.ts` — reused as-is (their
  existing `attributes` payload support is what populates `product_attribute_value_index`)

## Analysis: evercamps' flat variant model vs. a parent-product model

evercamps has no row that represents "the T-shirt" as a family — only `variant_group`, a thin
join table of up to 5 attribute FKs, and N independent `product` rows pointing at it via
`variant_group_id`. This is a different shape than WooCommerce (parent product + child
variations, each variation referencing the parent), Shopify, or Magento, all of which keep a
distinct parent/family record. Worth calling out explicitly since it's the root cause of several
choices in this doc (skipping the WC parent row, duplicating name/description/images onto every
variation, inventing our own per-parent `variant_group` idempotency tracking).

### Advantages

- **Every variant is a fully real, independently addressable product.** It has its own price,
  SKU, stock, status, `url_key`, images, SEO fields — every existing feature that already operates
  on `product` (search, collection filtering, tax rules, inventory, sitemap, checkout) works on
  variants for free. Nothing downstream needs a "is this a purchasable leaf or a non-purchasable
  parent" special case.
- **No half-object placeholder parent.** Because every row must be a real sellable product, there
  is no equivalent of WooCommerce's parent product with a blank/zero price and a synthetic SKU —
  exactly the ambiguity this plugin has to design around for WooCommerce's own parent rows (see
  "Key design decision" above). evercamps structurally can't produce that ambiguity.
- **Grouping is decoupled from creation and reversible.** `variant_group` is just a join; existing
  standalone products can be grouped after the fact (`addVariantItem`), and a product can be
  pulled back out without being deleted — `unlinkVariant/unlinkVariants.js:8-11` simply
  `UPDATE product SET variant_group_id = NULL`. WooCommerce's parent/child hierarchy is rigid by
  comparison: a variation only ever exists under the one parent it was created under.
- **No compound identity downstream.** Cart lines and order lines reference a single
  `product_id` — there's no need for the `(product_id, variation_id)` pair WooCommerce/Shopify
  require. `WooCommerceOrderLineItem` (`types.ts:80-91`) already carries both `product_id` and
  `variation_id` on the *WooCommerce* side; evercamps collapses that back to one id once imported,
  simplifying every consumer of order/cart data.
- **One attribute system, not two.** Variant-differentiating attributes (`variant_group.attribute_one..five`)
  and regular filterable/display attributes (`product_attribute_value_index`) are the same
  mechanism — a variant's color swatch and its facet-filter entry are backed by the same row, with
  no parallel "variant option" system to keep in sync.

### Disadvantages

- **No place to hold family-level content**, so nothing enforces consistency across siblings.
  Name, description, and images are duplicated onto every variant row rather than stored once —
  confirmed by `mapVariation.ts`'s own design in this doc: it has to copy the parent's
  name/description/images onto each variation because there's nowhere else to put them. Updating
  a shared field means updating N rows, and nothing stops one variant's copy from drifting out of
  sync with its siblings'.
- **No deterministic "representative variant."** `ProductCollection.js:99-113` — the admin product
  grid collapses a family to one row via
  `DISTINCT ON (COALESCE(product.variant_group_id, random())) product.product_id`, with
  `removeOrderBy()` called immediately before it (`ProductCollection.js:107`), so the specific
  variant chosen to represent the family in that grid is not deterministic run to run. The
  storefront listing path in the same class (the `!isAdmin` branch, `ProductCollection.js:63-97`)
  doesn't dedupe by `variant_group_id` at all — every variant lists as its own separate row/tile,
  filtered only by visibility. There's no "default variant" flag anywhere to pin this down.
- **Fixed 5-attribute ceiling, fixed at creation.** `variant_group` has exactly `attribute_one`
  through `attribute_five` (`core/modules/catalog/migration/Version-1.0.0.js:128-145`) — a hard
  cap on differentiating attributes per family, and nothing supports adding a 6th or changing the
  set later without a manual migration. WooCommerce variations aren't capped this way. This is
  exactly the "Known limitations" gap already noted above for attribute-set changes between import
  runs.
- **Loose referential integrity between `product.group_id` and `variant_group.attribute_group_id`.**
  `addVariantItem/[bodyParser]addItem.js:41-43` only checks that they match *at the moment a
  product is added to a group* — nothing in the schema keeps them in sync afterwards. A product's
  `group_id` could later be changed via `updateProduct` without touching `variant_group_id`,
  leaving a variant whose attribute group no longer matches the family it's still linked to. This
  import plugin avoids that drift for its own rows by re-asserting `group_id` on every
  create/update, but it isn't a guarantee evercamps enforces generally.
- **SEO/URL cost of "every variant is a full product."** The advantage above (every variant gets
  its own indexable `url_key`) cuts the other way for search: there's no single canonical
  family page to consolidate link equity onto, and near-duplicate per-color/per-size pages differing
  by little more than a swatch are a classic thin/duplicate-content risk. WooCommerce/Shopify's
  single parent URL with client-side variant switching avoids that trade-off entirely.
- **No family-level rollups.** Total sales, review aggregation, or "lowest price across variants"
  for a family all require a query grouped by `variant_group_id` rather than reading one parent
  row's stat — there's no native aggregate column or view for this.

## Migration path: introducing a real parent-product model

If the disadvantages above turn out to matter more than the flexibility of the flat model, this is
the sequence of changes that would be needed to give evercamps a genuine parent/family entity. This
is scoped as its own project, not a follow-on to the variations-import work above — it touches the
catalog schema, the storefront, the admin UI, and every place that reads product content, and would
need to happen on a live store without breaking existing product URLs.

**Guiding choice: extend `variant_group`, don't introduce a second `product` hierarchy.** `product`
is referenced throughout cart, checkout, tax, inventory, and every storefront page — cloning it into
a `product`/`product_variant` pair (the WooCommerce/Shopify shape) would touch all of that. Growing
the existing `variant_group` table into the family entity keeps every `product`-referencing
subsystem untouched; only the handful of places that already read `variant_group_id` or build the
variant switcher need to change.

1. **Schema — promote `variant_group` into a real family record.** Add family-level content columns
   to `variant_group` (or a purpose-renamed replacement): `name`, `url_key` (UNIQUE), `description`,
   `short_description`, `meta_title`/`meta_description`/`meta_keywords`, and a nullable
   `default_variant_id` FK back to `product` — the missing piece that would let the PLP grid and
   search results pick a deterministic tile instead of today's `DISTINCT ON (COALESCE(..., random()))`
   (`ProductCollection.js:99-113`). Simple (non-variant) products stay exempt — a product with
   `variant_group_id IS NULL` continues to mean "not part of a family," same as today, so this
   doesn't require touching every existing product row, only variant families.

2. **Data backfill.** Today, family-level content (name/description/images) only exists duplicated
   — and possibly diverged — across each family's N variant rows, since there's no single source of
   truth for it. Backfilling the new columns is a real content-curation pass, not a mechanical
   migration: for each existing `variant_group`, pick a source variant (lowest `product_id`, or an
   admin review pass) to seed `name`/`description`/`url_key`, and set `default_variant_id`
   accordingly (admin-overridable after). Net effect for *future* imports like the one in this
   document: the WooCommerce parent product's own name/description/images become the source of
   truth for these new columns directly, instead of `mapVariation.ts` needing to duplicate them onto
   every variation.

3. **Service layer.** Variant group creation today is only an HTTP route handler
   (`createVariantGroup/[bodyParser]saveGroup.js`, `addVariantItem/[bodyParser]addItem.js`) with no
   importable service function — unlike attributes (`createProductAttribute.ts`) or products
   (`createProduct.ts`, `updateProduct.ts`). Add `createProductFamily`/`updateProductFamily`
   services following that same pattern (validated payload, hookable, transactional), and have the
   existing routes call into them instead of writing SQL inline. This also gives future importers
   (this plugin included) an in-process function to call, rather than having to reimplement
   `variant_group` bookkeeping by hand as this plan's `runVariationImport.ts` currently does.

4. **Storefront listing (`ProductCollection.js`).** Replace the current representative-row pick
   (`ProductCollection.js:99-113`) with one driven by `default_variant_id` — deterministic, and
   admin-curatable instead of arbitrary. This is also the natural place to add a family price rollup
   ("from $X") to the grid tile, which the flat model has no query-free way to produce today.

5. **Storefront product page — smaller than it looks.** Much of the variant-switching UX already
   exists and doesn't need to be rebuilt: `Variants.jsx` and the `variantGroup { variantAttributes,
   items }` GraphQL data (`Variants.jsx:244-270`) already drive in-place swatch switching today, with
   no dedicated family entity behind it. What's actually missing is (a) a canonical family URL —
   today's route is per-variant (`productView/route.json`: `/product/:uuid`) with no separate family
   URL to serve as the SEO-preferred canonical target, and (b) sourcing shared content
   (`GeneralInfo.jsx`, `Description.jsx`, `Images.jsx`) from the new family columns instead of from
   whichever variant happened to be loaded. Decide whether sibling variant URLs keep resolving
   (with `rel=canonical` pointing at the family URL, preserving today's deep-linkability) or 301
   redirect to it outright.

6. **Sitemap / search index.** No sitemap generator or dedicated search-index subsystem exists in
   this codebase today (confirmed — no matches for either anywhere in `core/`) — product discovery
   already runs through `ProductCollection.js`, covered by step 4. This is a forward-looking note,
   not an active migration item: if either is added later, it should be family-aware (one entry per
   family, using `default_variant_id`) from the start rather than one entry per variant row.

7. **Cart / checkout / order — unaffected.** Confirmed advantage from the analysis above still
   holds after this migration: line items reference a single `product_id` (the specific variant)
   and need no structural change. Optionally surface the family name on receipts/order history for
   readability ("T-Shirt — Red, L" grouping) — a display-only addition.

8. **Admin UI.** The product grid's ad hoc dedup and the separate "Variant Group" tab
   (`core/modules/catalog/pages/admin/productEdit/VariantGroup.jsx`) get replaced by real family
   CRUD screens backed by the new service layer (step 3): a family is its own editable row
   (name/description/SEO) with its variants nested underneath. `createVariantGroup`/
   `addVariantItem`/`unlinkVariant` can stay as the lower-level "link this product to this family"
   primitives the new family screens call into.

9. **Rollout.** Ship in phases rather than one cutover, given how many subsystems touch `product`:
   first the additive schema + backfill + admin editing (no URL or query behavior changes, fully
   reversible); then switch the PLP grid and any search results to the deterministic
   `default_variant_id` pick once backfilled data is verified; only then take on the canonical-URL
   change from step 5 — the highest-risk, most customer- and SEO-visible step, needing `301`s from
   existing per-variant URLs so current search rankings aren't lost.

**Net scope.** This is a foundational, cross-cutting schema and routing change — an order of
magnitude larger than the variations-import feature this document was written for. It should be
scoped and staffed as its own project rather than folded into that work.

## How Shopify models this

Shopify's Admin API is the clearest, most widely-adopted reference implementation of the
parent/child shape most e-commerce platforms converge on (WooCommerce and Magento's
`configurable` products follow the same basic split):

- **`Product` (the parent).** Holds every family-level field: `title`, `descriptionHtml`,
  `vendor`, `productType` (Shopify's own free-text category — a different concept from variant
  options, not to be confused with evercamps' dormant `product.type` column from the earlier
  discussion), `tags`, `status` (active/draft/archived), SEO fields, and a **shared image/media
  gallery** owned by the product itself.
- **`ProductVariant` (the child, FK'd to a `Product`).** `title` is auto-generated from the
  selected option values (e.g. "Red / Large"), plus its own `price`, `compareAtPrice`, `sku`,
  `barcode`, `taxable`, and — directly relevant to the "virtual products" discussion above —
  **`requiresShipping`, a boolean living on the *variant*.** Inventory is not a flat quantity
  column: each variant links to an `InventoryItem`, tracked per-location via `InventoryLevel`
  rows, so multi-location stock is native. A variant's image isn't its own separate upload — it's
  an `image` **pointer into the product's shared gallery** ("this photo represents Red"), not a
  duplicated image set per variant.
- **`ProductOption` (up to 3 per product, a hard cap).** Each option is a name (`"Color"`) plus an
  ordered list of values, and — this is the important structural difference from evercamps' design
  — **options are defined per-product, not shared through a global, reusable table.** Shopify does
  not have one central "Color" row referenced by every product that uses it; each product owns its
  own option definitions. Variants store their selected values directly as `option1`/`option2`/
  `option3` slots on the variant row itself, not through a separate join/index table.
- **Exactly one canonical URL per product** — `/products/{handle}`. There is no per-variant URL.
  Variant selection happens entirely client-side on that single page (most themes read
  `?variant={id}` from the query string and re-render price/image/availability in place, no
  navigation). By construction, there's no duplicate/thin-content SEO problem to manage — the
  concern flagged in this doc's Analysis section simply doesn't arise.
- **Combined Listings** (a native Shopify feature, added 2024): when a merchant genuinely needs
  more differentiating options than the 3-option cap allows, Shopify's own answer wasn't to raise
  the cap — it's a separate feature that visually groups multiple already-independent, already-published
  products into one shopper-facing listing. Worth noting: even Shopify, at far greater scale and
  maturity, reached for a flexible cross-product grouping layer rather than loosening its
  fixed-slot option cap for the rare case — which is architecturally closer to evercamps'
  `variant_group` (an arbitrary, decoupled-from-creation join) than to Shopify's own primary
  `option1/2/3` mechanism. That's a point in favor of evercamps' more flexible base primitive, not
  against it.

### Mapping to evercamps

| Shopify concept | evercamps today | Gap / fork in the road |
|---|---|---|
| `Product` (parent) | — | Exactly what "Migration path" step 1 proposes adding, by growing `variant_group`. |
| `ProductVariant` | a `product` row | Already matches — every `product` row already behaves like a Shopify variant (own SKU/price/stock/weight). No migration needed for this half. |
| `ProductOption`, scoped per-product | `attribute` + `attribute_group_link`, shared **globally** across every product | Real fork, see below — evercamps currently reuses one "Color" attribute across unrelated products; Shopify never does. |
| `variant.requiresShipping` | no general equivalent — only the narrow `manage_registrations` special case (see prior discussion) | Confirms the earlier recommendation: add a general boolean, don't repurpose the dormant `type` column for this. |
| `variant.image` (pointer into shared gallery) | a full separate `images` array per product row | evercamps duplicates media per variant; Shopify references one shared pool. |
| One canonical URL, AJAX variant switching | **Partly already built** — `Variants.jsx` already does in-place, query-param-driven swatch switching without a full navigation | The one missing piece is exactly "Migration path" step 5: today's canonical URL is still per-variant (`/product/:uuid`), not per-family. |
| `InventoryItem`/`InventoryLevel` per location | flat `qty`/`manage_stock`/`stock_availability` on `product` | A materially bigger model (multi-location). Not required to match Shopify's parent/child shape — a separate, larger project if multi-location stock is ever a goal. |

### Refining the migration path toward Shopify's shape

Given the direction to move toward this model, two adjustments to the "Migration path" section
above are worth making deliberately rather than inheriting by default:

1. **Family/parent record**: no change to the earlier recommendation — extending `variant_group`
   into the parent row is already the same shape as Shopify's `Product`, just implemented by
   growing an existing table instead of introducing a new `product`/`product_variant` split.
2. **Option scope — the real decision to make now.** The current proposal (and this plugin's own
   WooCommerce-attribute mapping) assumes attributes are shared globally, reused across unrelated
   products by code (the `woocommerce_attribute_group_map` mechanism earlier in this doc exists
   *because* of that assumption). Matching Shopify faithfully means options are **product-scoped**
   instead: each family defines its own option set, with no cross-product reuse bookkeeping needed
   at all — simpler. The trade-off: evercamps' current design gets "variant swatches and
   storefront facet filtering share one system" for free (both read `product_attribute_value_index`
   off the same global `attribute` rows); Shopify doesn't get that for free either — it solves
   storefront filtering separately, via tags/metafields, not through `ProductOption`. So this isn't
   a strict downgrade, just a different, and arguably simpler, place to draw the line.
3. **Shipping flag**: add a general boolean (e.g. `requires_shipping`) at the variant/product level,
   generalizing the existing `manage_registrations` precedent, rather than resurrecting the dormant
   `type` column for it — consistent with the earlier conclusion.
4. **Canonical URL**: this remains the highest-leverage, most Shopify-defining change, and the
   good news is most of the client-side plumbing (`Variants.jsx`) already exists — the work is
   concentrated in the URL/routing layer (Migration path step 5), not in rebuilding the swatch UX.
5. **Cap philosophy**: keep `variant_group`'s existing flexible, decoupled-from-creation join
   design for the rare "more differentiators than fit" case, rather than trying to build unlimited
   in-line option slots — Shopify's own Combined Listings answer validates that this is the right
   shape to reach for, not a workaround to eliminate.

## How Shopify handles digital and virtual products

Shopify's core `Product`/`ProductVariant` model has **no `productType` value for "digital" or
"virtual."** Its actual mechanism is narrower and more composable than a type taxonomy:

- **`requiresShipping`** — the one native, first-class field for this, and it's a plain boolean on
  the *variant* (not a product-level "kind"). Setting it `false` removes the variant from shipping
  calculation and the shipping-address requirement at checkout. This is exactly the flag-based
  design already recommended earlier in this doc for evercamps.
- **Digital delivery (downloadable files) is not native at all.** Shopify does not ship a
  first-party "attach a file, auto-email a download link" feature in the core product model. It's
  handled entirely through apps — Shopify's own free "Digital Downloads" app, or third-party apps
  (SendOwl, FetchApp, etc.) — that attach a file to a line item and react to an order-paid webhook
  to deliver it. Shopify deliberately kept this out of the core schema.
- **Gift cards are the one deliberate exception** — a genuine first-class product kind
  (`Product.isGiftCard` / a dedicated `GiftCard` system object with its own code, balance, and
  expiry). Shopify built this in natively because a gift card's behavior is *structurally*
  different, not just "skip shipping": it mints a redeemable code/balance record, follows different
  tax rules in most jurisdictions, and has its own lifecycle (redemption, partial use, expiry) —
  none of which fits as a boolean flag on `Product`.
- **Subscriptions (`SellingPlan`/`SellingPlanGroup`)** follow the same pattern as gift cards
  structurally but stay *attached objects linked to variants*, not a `productType` value either —
  reinforcing that Shopify reserves the core type taxonomy for very little, and expresses almost
  everything else as either a boolean flag or a linked object.

**The pattern, stated as a rule:** Shopify promotes something to a true first-class product kind
only when it has a genuinely distinct backing data model (codes/balances for gift cards, billing
schedules for subscriptions) — not merely because it skips shipping or needs custom delivery.
"Doesn't need shipping" (virtual, digital, services, event tickets) stays a boolean + app-level
behavior for Shopify; it never becomes a `productType` value.

### Applying that lens to `manage_registrations` → `type: 'camp'`

Checked against that rule, "camp" clears the bar the same way gift cards do — this isn't a shallow
flag today, it's already a parallel, deep object model living in its own module:
`core/modules/camp/` has its own `Participant` and `Registration` entities (own migrations —
`camp/migration/Version-1.0.0.ts` through `1.0.2.ts` — own API routes for
create/update/delete on both, own admin grids/edit screens, own GraphQL types
`Participant.graphql`/`Registration.graphql`). That's structurally much closer to Shopify's gift
cards (a real object model: code + balance + expiry) than to "virtual" (a single shipping
boolean) — so promoting it to a genuine `type` value is well justified, and virtual/digital
should *not* follow the same path (they should stay composable flags, per the section above, and
specifically should not be added as more `type` values alongside `camp`).

**One data-migration wrinkle to plan for.** `manage_registrations` was added later, via
`core/modules/catalog/migration/Version-1.0.8.js:7` —
`` `ALTER TABLE product ADD COLUMN IF NOT EXISTS manage_registrations boolean NOT NULL DEFAULT TRUE` ``
— **default `TRUE`**, not `FALSE`. That means camp/registration is the default assumption for a
product in this platform today, and "simple product" is the opt-out, not the other way around
(consistent with evercamps being a camp-registration platform first). This matters directly for
backfilling `type`: a naive `ALTER TABLE product ADD COLUMN type varchar DEFAULT 'simple'` would
silently misclassify most of the existing catalog. The backfill has to read each row's actual
current value: `UPDATE product SET type = CASE WHEN manage_registrations THEN 'camp' ELSE 'simple'
END`, not rely on either column's own default.

**Where the boolean is read today** (everything that would need to switch to reading `type ===
'camp'`, or to a computed field derived from it during a transition period):
`core/modules/checkout/pages/frontStore/checkout/ShipmentStep.jsx:31-33` (skips the Shipment step
when every cart item is a registration), `core/modules/checkout/services/cart/Cart.ts:200-208`
(loads `product.manage_registrations` per cart item), `core/modules/checkout/services/cart/fields/cartItem/camps.ts`
(cart item field resolver), `core/modules/catalog/pages/admin/productEdit+productNew/Status.jsx`
(the admin Enabled/Disabled toggle, currently buried in the generic product edit form),
`Product.graphql`/`Registration.graphql` (`manageRegistrations` field), plus
`orderValidator.ts`/`orderCreator.ts` and `RegistrationSkuSelector.jsx` in the promotion module.
To avoid a flag-day break across all of these, keep a `manageRegistrations` GraphQL field alive as
a computed value (`type === 'camp' ? 1 : 0`) during the transition, migrate each consumer to read
`type` directly at its own pace, then drop the boolean once nothing depends on it.

**A UX upside that falls out of this for free**, mirroring how Shopify treats gift cards: today,
"this is a camp product" is a checkbox buried inside editing an already-created generic product
(`Status.jsx`). Promoting it to `type` opens the door to a real distinct creation flow — choosing
"Camp" vs. "Simple product" up front in `ProductNewForm.jsx`, the same way Shopify's product
creation flow branches meaningfully once "This is a gift card" is checked — rather than a setting
discovered after the fact.
