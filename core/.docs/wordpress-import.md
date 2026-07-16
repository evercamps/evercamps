# WooCommerce Product Import Plugin

## Context

A new first-party plugin, `content/plugins/woocommerce-import`, that imports products from a
live WooCommerce store via the WooCommerce REST API v3. Scope for v1, per your answers:

- **Manual trigger only** — an "Import products now" button on the plugin's own admin settings
  page. No cron/scheduled sync yet.
- **Matching strategy**: a dedicated external-id mapping table, not a raw column bolted onto
  `product` and not SKU matching. Every local product created by this plugin is tied to its
  WooCommerce product id through that table, so a re-import updates the same row instead of
  duplicating it.
- **Rollback**: import runs are grouped into batches. A failed/partial batch can be identified
  in the admin UI and its newly-created products deleted in one action, without touching
  products that already existed and were merely updated.
- **100% TypeScript.**

This plan follows the one real precedent plugin already in the repo,
`content/plugins/national-number-field` (structure, `bootstrap.ts`, migration pattern), and the
core `setting` and `catalog` modules for how settings storage and product creation actually work
today. All facts below (file paths, function signatures, schema fields) were confirmed by
reading the current code, not assumed.

## Target file layout

```
content/plugins/woocommerce-import/
  package.json                 # "type": "module", compile (swc) + typecheck scripts, matches national-number-field
  tsconfig.json                 # own tsconfig, rootDir ./src, outDir ./dist, module NodeNext
  src/
    bootstrap.ts                 # plugin entry point, loaded at startup (kept minimal, see below)
    types.ts                     # WooCommerceProduct, WooCommerceSettings, ImportBatchSummary
    lib/
      woocommerceClient.ts        # axios client for the WC REST API
      mapProduct.ts                # WooCommerceProduct -> ProductData mapping
      runImport.ts                 # the import loop + batch bookkeeping
    migration/
      Version-1.0.0.ts             # creates woocommerce_import_batch + woocommerce_product_map
    services/
      settings.ts                  # typed wrapper around core's getSetting/refreshSetting
      importBatch.ts               # startBatch/recordSuccess/recordFailure/finishBatch/listBatches/rollbackBatch
    graphql/
      types/WooCommerceSetting/WooCommerceSetting.graphql + .resolvers.ts
      types/WooCommerceImportBatch/WooCommerceImportBatch.graphql + .resolvers.ts
    api/
      routes.ts                     # ordering manifest (region: admin + api entries)
      importProducts/
        route.json                  # { methods: ["POST"], path: "/wc-import/products", access: "private" }
        bodyParser.ts
        importProducts.ts
      rollbackBatch/
        route.json                  # { methods: ["DELETE"], path: "/wc-import/batches/:id", access: "private" }
        rollbackBatch.ts
      # settings are saved through core's existing POST /api/settings — no new route needed
    pages/
      admin/
        wooCommerceSettings/
          route.json                 # { methods: ["GET"], path: "/wc-import/settings" } -> /admin/wc-import/settings
          index.ts                    # sets pageInfo (title/description)
          WooCommerceSettings.tsx
        all/
          WooCommerceSettingMenu.tsx   # areaId: settingPageMenu, links into the page above
```

Registered exactly like `national-number-field` in `config/default.json`:

```json
{ "name": "woocommerce-import", "resolve": "content/plugins/woocommerce-import", "enabled": true, "priority": 100 }
```

## Database schema (`migration/Version-1.0.0.ts`)

Raw `execute()` calls inside the default-exported migration function, same technique
`national-number-field`'s migration uses on `participant`. Two new tables — **no changes to the
core `product` table**, since evercamps has no existing per-product metadata/custom-field
mechanism (the `attribute`/`product_attribute_value_index` system is merchandising-facing, shown
to admins/customers, and would leak an internal bookkeeping id into that UI if repurposed).

```sql
CREATE TABLE IF NOT EXISTS "woocommerce_import_batch" (
  "woocommerce_import_batch_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "status" varchar NOT NULL DEFAULT 'running', -- running | completed | partial | failed
  "total_fetched" INT NOT NULL DEFAULT 0,
  "total_created" INT NOT NULL DEFAULT 0,
  "total_updated" INT NOT NULL DEFAULT 0,
  "total_failed" INT NOT NULL DEFAULT 0,
  "error_message" text DEFAULT NULL,
  "started_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "woocommerce_product_map" (
  "woocommerce_product_map_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "external_product_id" INT NOT NULL,
  "product_id" INT DEFAULT NULL REFERENCES "product"("product_id") ON DELETE CASCADE,
  "created_in_batch_id" INT NOT NULL REFERENCES "woocommerce_import_batch"("woocommerce_import_batch_id"),
  "last_batch_id" INT NOT NULL REFERENCES "woocommerce_import_batch"("woocommerce_import_batch_id"),
  "status" varchar NOT NULL DEFAULT 'success', -- success | failed
  "error_message" text DEFAULT NULL,
  "external_updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WC_PRODUCT_MAP_EXTERNAL_ID_UNIQUE" UNIQUE ("external_product_id")
);
```

- `product_id` is nullable + `ON DELETE CASCADE`: if a product created by this plugin is later
  deleted through the normal admin product grid, its map row disappears automatically instead
  of dangling.
- `created_in_batch_id` (set once, immutable) vs `last_batch_id` (updated on every re-import
  touch) is what makes "delete everything a specific failed batch created" possible without also
  deleting a product that already existed before that batch ran and only had its price/stock
  refreshed.
- A row can exist with `product_id: null` and `status: 'failed'` — that's a WooCommerce product
  whose `createProduct` call itself threw (e.g. SKU collision); it's still visible in the batch
  history for troubleshooting even though no local product was ever created.
- This runs through the existing migration runner (`includes/bin/lib/bootstrap/migrate.js`),
  which walks every core module's and every enabled extension's `migration/Version-X.Y.Z.js`
  files and tracks applied versions per module name in a `migration` table — nothing new needed
  there.

## Settings

Reuse the framework's generic `setting` key/value table (`core/modules/setting`) — don't invent
a plugin-specific settings table:

- Keys: `wooCommerceStoreUrl`, `wooCommerceConsumerKey`, `wooCommerceConsumerSecret`.
- **Save**: the settings form posts straight to the existing generic
  `POST /api/settings` route (`core/modules/setting/api/saveSetting/saveSetting.ts`, which does
  an `insertOnUpdate('setting', ['name'])` per key in the request body) — no new save endpoint
  needed.
- **Read** (server-side, from the import job): `getSetting<string>('wooCommerceStoreUrl', '')`
  from `core/modules/setting/services/setting.ts`, wrapped in
  `services/settings.ts::getWooCommerceSettings()` for a typed return shape.
- **Expose to the admin form via GraphQL**: extend the `Setting` type the same way
  `core/modules/setting/pages/admin/storeSetting/StoreSetting.graphql` does, e.g.
  `graphql/types/WooCommerceSetting/WooCommerceSetting.graphql` adding
  `wooCommerceStoreUrl` and `wooCommerceConsumerKey` fields resolved off the same `setting` rows.
  **Never resolve `wooCommerceConsumerSecret` back through GraphQL** — the settings form always
  renders that field blank and only sends a new value when the admin actually retypes it.

## WooCommerce REST client (`lib/woocommerceClient.ts`)

- Plain `axios` (already a root dependency, `^1.7.7` — no new HTTP library needed), instance
  `baseURL: ${storeUrl}/wp-json/wc/v3`, authenticated with `consumer_key`/`consumer_secret` as
  query params (WooCommerce's documented convention over HTTPS). Refuse to run the import and
  surface a clear error if `storeUrl` isn't `https://` — query-string credentials over plain HTTP
  would leak the API secret in transit and in server logs.
- `fetchAllProducts(client)`: an async generator paginating `GET /products?page=n&per_page=50`
  until an empty page is returned.

## Import flow (`lib/runImport.ts`)

1. `startBatch()` → insert a `woocommerce_import_batch` row, `status: 'running'`.
2. For each WooCommerce product, map it to `ProductData` (the type already exported from
   `core/modules/catalog/services/product/createProduct.ts`) via `mapProduct.ts` (field mapping
   below), then:
   - Look up an existing `woocommerce_product_map` row by `external_product_id`.
   - **No row found** → call `createProduct(data, context)` — imported and called **directly**
     from `core/modules/catalog/services/product/createProduct.js`, in-process, the same way
     core's own `createProduct[finish].js` route handler calls it. No need to loop the import
     back through our own HTTP API. On success, insert a map row
     (`created_in_batch_id = last_batch_id = batchId`, `product_id`, `status: 'success'`). On
     failure (thrown error, e.g. SKU collision), insert a map row with `product_id: null`,
     `status: 'failed'`, `error_message`, and continue to the next product — one bad row must
     not abort the whole batch.
   - **Row found with a `product_id`** → look up that product's `uuid` and call
     `updateProduct(uuid, data, context)` (`core/modules/catalog/services/product/updateProduct.ts`).
     On success, bump `last_batch_id` and `external_updated_at`. On failure, set
     `status: 'failed'` / `error_message` but leave `product_id` and the existing product alone.
   - Increment the batch's running counters as you go.
3. `finishBatch(batchId, status)` where `status` is `'completed'` (no failures), `'partial'`
   (some created/updated, some failed), or `'failed'` (nothing succeeded).
4. Return the batch summary to the API route, which returns it to the admin UI.

### Field mapping (`lib/mapProduct.ts`)

Confirmed against `core/modules/catalog/services/product/productDataSchema.json` and the
`product`/`product_description` schema in `core/modules/catalog/migration/Version-1.0.0.js`:

| WooCommerce field | ProductData field | Notes |
|---|---|---|
| `name` | `name` | |
| `slug` | `url_key` | |
| `sku` | `sku` | unique locally — a collision makes `createProduct` throw, which the per-row try/catch turns into a `status:'failed'` map row rather than aborting the batch |
| `regular_price` (string) | `price` | `parseFloat` |
| `stock_quantity` | `qty` | default `0` when WooCommerce has `manage_stock` off and returns `null` |
| `manage_stock` | `manage_stock` | boolean → `0`/`1` |
| `stock_status` (`instock`/`onbackorder` → 1, `outofstock` → 0) | `stock_availability` | |
| `status` (`publish` → 1, else 0) | `status` | confirmed `productDataSchema.json` treats this as a `0`/`1` flag, not a free-form string |
| `weight` | `weight` | |
| `images[].src` | `images: string[]` | **verify before implementing**: `createProduct`'s `insertProductImages` stores each entry as `origin_image` directly; confirm against `core/modules/catalog/subscribers/product_image_added/generateLocalImages.js` whether a remote WooCommerce URL is fetched automatically or whether the plugin must download into `CONSTANTS.MEDIAPATH` itself first |
| — | `group_id` | hardcode `1`, the default attribute group (confirmed via the special-cased `attribute_group_id === 1` check in `core/modules/catalog/api/deleteAttributeGroup/deleteAttributeGroup.js` — group `1` can't be deleted, i.e. it's the always-present default) |
| — | `visibility` | hardcode `1` for v1 |
| — | `manage_registrations` | hardcode `0` — camp-specific field, no WooCommerce equivalent |

Categories, variable products/variations, tags, and WooCommerce custom attributes are **not**
mapped in v1 (see Non-goals) — only simple/physical products import cleanly with the fields
above.

## API routes

Confirmed current routing mechanism (this matters for writing routes in pure TypeScript with no
bracket-encoded filenames):

- `route.json` per route folder is still what actually registers a path/method/access —
  `includes/lib/router/scanForRoutes.ts` reads it directly, and `api/routes.ts` does **not**
  replace this requirement.
- `api/routes.ts` (a module-level manifest, `RouteDefinition[]` from `includes/lib/middleware/types.ts`)
  supplies **explicit middleware ordering**, which `includes/lib/middleware/index.ts::getModuleMiddlewares`
  uses to override the filename-derived `before`/`after` defaults. Once it's present, middleware
  files can be **plain-named TypeScript** (`bodyParser.ts`, `importProducts.ts`) — no
  `[after]id[before].ts` bracket encoding needed. This is the pattern `core/modules/catalog/api/routes.ts`
  and `core/modules/setting/api/routes.ts` already use for their own routes.

```ts
// content/plugins/woocommerce-import/src/api/routes.ts
import type { RouteDefinition } from '../../../../includes/lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  {
    routeId: 'wooCommerceSettings',
    region: 'admin',
    middleware: [{ id: 'index', after: ['auth'], before: ['buildQuery'] }]
  },
  {
    routeId: 'importProducts',
    region: 'api',
    path: '/wc-import/products',
    methods: ['POST'],
    middleware: [
      { id: 'bodyParser', after: ['context'], before: ['auth'] },
      { id: 'importProducts', after: ['escapeHtml'], before: ['apiResponse'] }
    ]
  },
  {
    routeId: 'rollbackBatch',
    region: 'api',
    path: '/wc-import/batches/:id',
    methods: ['DELETE'],
    middleware: [
      { id: 'rollbackBatch', after: ['escapeHtml'], before: ['apiResponse'] }
    ]
  }
];
```

Each `routeId` still needs its own `route.json` (e.g.
`api/importProducts/route.json = { "methods": ["POST"], "path": "/wc-import/products", "access": "private" }`)
exactly like `core/modules/catalog/api/createProduct/route.json` — that's plain JSON metadata, not
code, so it doesn't conflict with writing all actual logic in TypeScript.

## Admin UI

Modeled directly on `core/modules/setting/pages/admin/storeSetting/StoreSetting.tsx`:

- `WooCommerceSettings.tsx` exports `layout = { areaId: 'content', sortOrder: 10 }` and a
  GraphQL `query` pulling `saveSettingApi: url(routeId:"saveSetting")`,
  `importProductsApi: url(routeId:"importProducts")`, and the extended
  `setting { wooCommerceStoreUrl wooCommerceConsumerKey }` fields.
- A `<Form method="POST" action={saveSettingApi}>` (same `@components/form/Form` used by
  `StoreSetting.tsx`) with `wooCommerceStoreUrl` / `wooCommerceConsumerKey` /
  `wooCommerceConsumerSecret` fields; the secret field always starts blank.
- A separate "Import products now" button (outside that form) that POSTs to
  `importProductsApi` and shows the returned `{created, updated, failed}` counts via a
  `react-toastify` toast, matching `StoreSetting.tsx`'s existing success/error toast pattern.
- A batch history table (recent `woocommerce_import_batch` rows, via the new
  `WooCommerceImportBatch` GraphQL type) with a "Remove products from this batch" action per
  failed/partial row → `DELETE /api/wc-import/batches/:id` (`rollbackBatch.ts`): find every
  `woocommerce_product_map` row with `created_in_batch_id = :id`, call
  `deleteProduct(uuid, context)` (`core/modules/catalog/services/product/deleteProduct.ts`) for
  each one that still has a `product_id`, then delete the map rows and the batch row.
- Nav entry: `pages/admin/all/WooCommerceSettingMenu.tsx`, `areaId: 'settingPageMenu'`, mirroring
  `core/modules/setting/pages/admin/all/StoreSettingMenu.tsx` — links into the settings page.

## bootstrap.ts

Nothing exotic needed for v1 — the plugin drives product creation itself rather than
intercepting core's own create/update flow, so no `addProcessor`/`hookBefore` registration is
required (unlike `national-number-field`, which hooks `participantDataBeforeCreate`/`Update`
because it augments an *existing* core form). Keep it a minimal no-op unless a later requirement
needs to react to core catalog events.

## Non-goals for v1 (explicitly deferred)

- **Scheduled/automatic sync.** `includes/lib/cronjob/jobManager.ts`'s `registerJob({name,
  resolve, schedule, enabled})` is the existing mechanism for this and would be a natural v2
  add-on once manual import is proven — infrastructure exists, currently unused by any core
  module.
- WooCommerce categories, variable products/variations, and custom attributes → evercamps
  attribute system mapping.
- Two-way sync (evercamps → WooCommerce) — v1 is one-directional (WooCommerce → evercamps) only.
- Diffing on WooCommerce's `date_modified` to skip unchanged products — v1 re-fetches and
  re-`updateProduct`s everything on every run, which is correct but not the cheapest.
- Emitting a `woocommerce_product_imported` event via `includes/lib/event/emitter.ts` for other
  plugins to subscribe to.

## Verification

- `tsc --noEmit` inside the plugin (its own `typecheck` script, matching
  `national-number-field/package.json`).
- Manual, against your live WooCommerce instance:
  1. Add the `system.extensions` entry, `npm run dev`, log into `/admin`, confirm the new
     "WooCommerce Import" nav entry appears under Settings.
  2. Save the real store URL + consumer key/secret, click "Import products now", confirm the
     returned counts match the store's actual product count and spot-check 2-3 imported products
     in the admin product grid (price/SKU/stock correct).
  3. Re-run the import and confirm the same rows get **updated** (`total_updated > 0`,
     `total_created = 0`), not duplicated.
  4. Force a failure (e.g. temporarily point one product's SKU at an existing local SKU) and
     confirm the batch finishes `status: 'partial'` with a nonzero `total_failed` instead of
     aborting entirely, and that "Remove products from this batch" on a different, fully-failed
     batch deletes only the products *that batch* created.

## Critical files

- `content/plugins/woocommerce-import/src/migration/Version-1.0.0.ts` — new tables
- `content/plugins/woocommerce-import/src/lib/runImport.ts` — the core import loop
- `content/plugins/woocommerce-import/src/lib/mapProduct.ts` — field mapping, most likely to need
  iteration once tested against the real store's data
- `content/plugins/woocommerce-import/src/api/{importProducts,rollbackBatch}/` + `api/routes.ts`
- `content/plugins/woocommerce-import/src/pages/admin/wooCommerceSettings/WooCommerceSettings.tsx`
- `core/modules/catalog/services/product/{createProduct,updateProduct,deleteProduct}.ts` — reused
  as-is, not modified
- `core/modules/setting/services/setting.ts` + `core/modules/setting/api/saveSetting/` — reused
  as-is, not modified
- `config/default.json` — new `system.extensions` entry
