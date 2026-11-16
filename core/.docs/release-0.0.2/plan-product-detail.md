# Product detail: collections on the product page + hide the lone default variant

## Context

Two `[planning]` items from `core/.docs/release-0.0.2/planning.md` (features > product detail):

1. *"It should be easier to add the product to a collection. Now I have to go to collections first
   and then add it."*
2. *"If there is only one default variant, don't show it, fill in the general fields with the data."*

The third product-detail item (variant editing in a modal + inline enable/disable) has been **merged**
(#179, `5a38976`). Item 2 builds on top of that version of `productEdit/Variants.tsx`.

Both items are admin UI work on the product edit page (`/products/edit/:id`,
`core/modules/catalog/pages/admin/productEdit/route.json`). Item 1 needs no migration. Item 2 needs one
small backfill migration (`product.type`).

---

## 1. Add/remove collections from the product page

### Decisions

- Collection links are saved **immediately** (own API calls), not with the product's Save button.
- **No** inline "create new collection" from the product page.
- The card stays on the **edit** page only (no new-product support this release).

### Current state

**Product page, read only.** `core/modules/catalog/pages/admin/productEdit/Collection.tsx`
- Renders a `"Collections"` card in `rightSide` (`layout`, `Collection.tsx:48-51`, sortOrder 15). It lists
  `product.collections` as links to the collection edit page (`Collection.tsx:27-38`) and shows "No collections" when the list is empty (`:40-42`).
- Its query (`Collection.tsx:53-63`) only asks for `uuid`, `name`, `editUrl`. There is no add or remove action.
- The card exists only under `productEdit/`, not under `productEdit+productNew/`, so it doesn't show on the *new* product page.
- `Inventory.tsx` (`productEdit+productNew/Inventory.tsx:81-84`) also uses `rightSide` / sortOrder 15, so the order of the two cards is not well defined.

**Collection page, the only place to edit the link today.**
- `core/modules/catalog/pages/admin/collectionEdit/Products.tsx` lists the collection's products. It opens a modal (`useModal`, `:81`, `:159-170`) with
  `core/components/admin/catalog/collection/collectionEdit/AddProducts.tsx`. That modal wraps `ProductSkuSelector` and POSTs
  `{ product_id: <product uuid> }` to `addProductApi` for each product picked (`AddProducts.tsx:31-50`).
- Removing a product is done per row with `Product.removeFromCollectionUrl` (`Products.tsx:24`, `:67`, `:113`).

**APIs (both already exist and can be reused as they are):**

| Route id | Method + path | Handler |
|---|---|---|
| `addProductToCollection` | `POST /collections/:collection_id/products`, body `{ product_id }` | `core/modules/catalog/api/addProductToCollection/addProducts.ts` |
| `removeProductFromCollection` | `DELETE /collections/:collection_id/products/:product_id` | `core/modules/catalog/api/removeProductFromCollection/removeProducts.ts` |

- Both take **uuids**: collection uuid in the path, product uuid in the body or path (`addProducts.ts:48-74`, `removeProducts.ts:33-58`). Both are `access: private`.
- Both also apply the change to all sibling products of a legacy `variant_group_id` (`addProducts.ts:85-103`, `removeProducts.ts:69-86`). This doesn't matter for camps (that mechanism isn't used with the new `product_variant`), and it can stay.
- Add uses `insertOnUpdate('product_collection', ['collection_id','product_id'])`, so it is idempotent. The response is `{ success, data: { product_id, collection_id } }`, which uses **ints** (`addProducts.ts:111-118`).
- Errors come back as `{ success: false, message }`, not the `{ error: { message } }` shape used by the variant APIs.

**GraphQL**
- `Collection.addProductUrl` already exists (`core/modules/catalog/graphql/types/Collection/Collection.admin.resolvers.ts:23-26`).
- `Product.removeFromCollectionUrl` (`Collection.admin.resolvers.ts:36-58`) only works when `product.collectionId` is set. That is only the case when the product comes from `Collection.products`, **not** from `Product.collections`, so the product page can't use it.
- `Product.collections` (`Collection.resolvers.ts:110-130`) joins `product_collection` and returns camel-cased `collection` rows.
- `Query.collections(filters)` (`Collection.graphql:26-29`) supports `name`, `page` and `limit` filters, which a picker needs.

**DB:** `product_collection` (`core/modules/catalog/migration/Version-1.0.0.ts:450-466`) has
`(collection_id, product_id)` with a `PRODUCT_COLLECTION_UNIQUE` constraint and `ON DELETE CASCADE` on both FKs. No change is needed.

**Reusable picker:** `core/components/admin/promotion/couponEdit/CollectionSelector.jsx` is a paginated collection search with
select and unselect buttons, driven by `selectedIDs: number[]`. It calls `onSelect(collection.collectionId)` / `onUnSelect(collection.collectionId)` with the **int id only** (`:114-132`), but its query already fetches `uuid` (`:10-20`).

### Proposal

**Save behaviour: immediate.** This follows the same convention as the `Variants`
card (`productEdit/Variants.tsx:17-19`: "nothing in this card is posted with the product; it talks to its own API routes"):
- Inputs have no `name` and buttons are `type="button"`, so nothing gets into the `productForm` PATCH.
- Each add or remove calls the existing API straight away, shows a toast, and re-runs the card query.
- Show "Changes are saved immediately" as a subtle hint in the card, so nobody expects "Save" to undo a removal.

**Steps**

1. **GraphQL: expose remove and add URLs from the product's side.**
   - In `Collection.resolvers.ts` `Product.collections` (`:110-130`), add `productUuid: product.uuid` to each returned row. (`product` is the parent; check that `uuid` is loaded by the product loader. The `Product` interface at `:26-28` only declares `productId`.)
   - In `Collection.admin.graphql`, add `removeProductUrl: String` on `Collection`. In `Collection.admin.resolvers.ts`, resolve it as
     `collection.productUuid ? buildUrl('removeProductFromCollection', { collection_id: collection.uuid, product_id: collection.productUuid }) : null`.
   - For the add action, the card uses `Collection.addProductUrl` of the collection the user picked, plus the product uuid. That means the card query needs `product { uuid }` (`productUuid` is already in context, `productEdit/index.ts:43`).
2. **Make `CollectionSelector` give back the whole collection.** Change it to `onSelect(collection.collectionId, collection)` /
   `onUnSelect(collection.collectionId, collection)` and add `addProductUrl` to its query. This is backward compatible for the coupon editor, which ignores the second argument.
3. **Rewrite `productEdit/Collection.tsx`.**
   - Fetch the data client-side with `useQuery` on `product(id: $id) { uuid collections { collectionId uuid name editUrl removeProductUrl } }`, using `requestPolicy: 'network-only'` for refreshes. This follows the pattern in `Variants.tsx` (`reexecute`, `:466`). Keep the SSR `query` export minimal (`productId`, `uuid`).
   - Card action **"Add to collection"** opens a modal (`useModal`, same markup as `collectionEdit/Products.tsx:159-170`) with `CollectionSelector`. Set `selectedIDs` to the current `collectionId`s.
     - `onSelect` sends `POST collection.addProductUrl` with `{ product_id: product.uuid }`.
     - `onUnSelect` sends `DELETE` to the matching `removeProductUrl`.
     - Both refresh the list.
   - Each listed collection gets a "Remove" link (`type="button"`) that calls `DELETE removeProductUrl`. Ask for confirmation through `useAlertContext`, the same way `Variants.tsx:508-528` does.
   - Handle the `{ success:false, message }` error shape (it's different from the variant APIs, see above).
   - Fix the sortOrder clash with `Inventory.tsx`, e.g. Collections → `rightSide` 20.
4. **Test manually:**
   - Add from the product page → the product shows in `collectionEdit/Products.tsx`.
   - Remove from the product page → it's gone there.
   - Adding twice does nothing (idempotent).
   - Removing the last collection shows "No collections".
   - The coupon `CollectionSelector` still works.

---

## 2. Hide the lone default variant; general fields edit it

### Decisions

- The mode is **stored** in the existing `product.type` column: `'simple'` or `'configurable'`. It is not derived from the variant list.
- A product goes from `simple` → `configurable` when its first extra variant is created. It **never** goes back automatically.
- In configurable mode:
  - General `sku`/`price` stay **editable**, with a "base/listing value" hint.
  - Inventory `qty` is **hidden**.
- When a delete leaves the product without a default variant, a remaining variant is **promoted to `is_default`**. The product stays `configurable`.
- The default variant's `status` does **not** mirror the product `status`.
- The new-product page says nothing about variants.
- Existing products are backfilled with a migration.

### Current state

**Data model**
- `product.type varchar NOT NULL DEFAULT 'simple'` already exists (`core/modules/catalog/migration/Version-1.0.0.ts:178`). Nothing writes or reads it today. All products are `'simple'`, and the demo data in `Version-1.0.4.ts` sets `'simple'` explicitly. It is not exposed in GraphQL (`Product.graphql:4`).
- The product grid has a "Simple / Configurable" type filter (`core/modules/catalog/pages/admin/productGrid/Grid.tsx:315-345`). Its backend (`core/modules/catalog/services/registerDefaultProductCollectionFilters.ts:221-250`) checks the legacy `product.variant_group_id IS [NOT] NULL`, not `product.type`.
- `product_variant.is_default` + unique partial index `PRODUCT_VARIANT_ONE_DEFAULT` (at most one default per product):
  `Version-1.1.1.ts:7-19`. The backfill (`:21-68`) makes a product's only variant the default, and creates a default variant + `inventory_item` for products that had none.
- `product_variant.status` (enable/disable per variant): `Version-1.1.3.ts:4-10`.
- GraphQL `Product.variants: [ProductVariant!]!` with `isDefault`, `status`, `options`, `usageCount`, `updateApi`, `deleteApi`: `core/modules/catalog/graphql/types/ProductVariant/ProductVariant.graphql:45-52`.

**Default-variant sync (product → variant, one direction).** `core/modules/catalog/services/product/defaultVariant.ts`
- `ensureDefaultVariant` (`:49-78`) runs from `createProduct` (`createProduct.ts:217-223`). It creates the default variant from the product's `sku`/`price`/`qty` (with `resolveVariantSku` fallback `<sku>-<productId>`, `:24-38`).
- `syncDefaultVariant` (`:89-160`) runs from `updateProduct` (`updateProduct.ts:379-385`) after `updateProductInventory`.
  - It **only** syncs when the product has exactly one variant and it is `is_default` (`:108-110`).
  - It copies `sku` and `price`. It copies `qty` as `inventory_item.total_seats = qty + reserved seats`, because `product_inventory.qty` is *free* seats (the legacy trigger lowers it per order) while `total_seats` is capacity.
- `updateProductVariantFunc` (`core/modules/catalog/services/product/productVariants.ts:193-241`) changes only the variant. There is no reverse sync.

**Variant service** (`productVariants.ts`)
- `createProductVariantFunc` (`:161-191`) always inserts with `is_default: false`, unless `data.is_default` is set (then `setOnlyDefault`, `:136-146`).
- `deleteProductVariantFunc` (`:261-281`) refuses to delete the last variant ("A product needs at least one variant") or a variant that is in use. It **does** allow deleting the default variant when others remain, which leaves the product without a default today.

**UI today (after the modal merge): the same data is shown twice.**
- General card: `SKUPriceWeight` posts `sku` / `price` (`core/modules/catalog/pages/admin/productEdit+productNew/General.tsx:62-108`, registered at `:322-332`) with the product form.
- Inventory card: posts `qty`, `manage_stock`, `stock_availability` (`productEdit+productNew/Inventory.tsx:30-79`).
- Variants card (`productEdit/Variants.tsx`, `leftSide` sortOrder 20, `:679-682`, edit page only):
  - Lists *all* variants, including a lone default one, with a `default` badge (`:615`) and an inline `StatusToggle` (`:409-437`, `:640`).
  - "Add variant" (`:536`) and row edit open `VariantForm` (`:222-405`) in a modal (`useModal`, `:452`, `:468-476`). The form includes a "Default variant" checkbox (`:378`) and an "Enabled" checkbox (`:385`).
  - "Delete" shows only when `usageCount === 0 && variants.length > 1`.
- `ProductEditForm.tsx` is the `<Form method="PATCH">` wrapper. The product form posts to `updateProduct`, and `syncDefaultVariant` then mirrors into the default variant.

So for a single-default product the backend already treats the general fields as the source of truth. What's missing is the UI (hide the redundant card) and an explicit, stored mode, so the page doesn't have to guess from the variant list.

### Proposal

**Simple mode** (`product.type === 'simple'`)
- The Variants card collapses to a one-line card: *"This product has no variants. Price, SKU and seats are edited in General / Inventory."* plus the **"Add variant"** action.
  - The variant table, the `StatusToggle` and the row actions are not rendered.
  - The product is enabled/disabled through the product `Status` card (`productEdit+productNew/Status.tsx`) only. Disabling its only variant would make it unbookable while the product still looks enabled.
- General (`sku`, `price`) and Inventory (`qty`) stay as they are and keep posting with the product form. `syncDefaultVariant` writes them into the default variant.
- Optional: under Inventory `qty`, show "Capacity: N (M reserved)" from `variants[0].totalSeats` / `usageCount`, so the free-qty versus capacity difference is visible.

**Configurable mode** (`product.type === 'configurable'`)
- The Variants card is shown as it is today (list + modal + status toggle).
- General `sku`/`price` stay editable. Add the hint *"Base/listing value. Each variant has its own price and SKU."* `product.price`/`product.sku` are still used by listings, the product grid (`components/admin/catalog/productGrid/rows/PriceRow.jsx`) and the legacy cart.
- The Inventory `qty` field is **not rendered**. `qty` isn't required in `productDataSchema.json` (`:55-60`), so leaving it out of the PATCH leaves `product_inventory.qty` untouched. Verify that `updateProductInventory` (`updateProduct.ts:42-50`) doesn't write `undefined`/`null`. `manage_stock` / `stock_availability` stay.
- `syncDefaultVariant` does nothing, even if only one default variant is left.

**Switching simple → configurable ("Add variant" on a simple product)**
1. `POST createVariantApi` creates the second variant as it does today.
2. In the same transaction, `createProductVariantFunc` sets `product.type = 'configurable'` when it is `'simple'`. The backend owns the switch, so a variant created through the API from anywhere also flips the type.
3. The existing default variant stays, and is now shown as a normal row with its current sku/price/seats. It has no title or options yet, so the card shows a warning badge on it ("Give this variant a name/option"). Optionally, open it in the edit modal right after the create.
4. The page refreshes the product query (or reloads), so General/Inventory pick up the new `type`.

**Configurable, deleting variants**
- The product stays `configurable`, even with only one variant left. No reverse sync is needed: in configurable mode the product fields are only base values, and they never overwrite a variant.
- In `deleteProductVariantFunc`: if the deleted variant was `is_default`, promote a remaining variant to `is_default` (via `setOnlyDefault`) in the same transaction. When one variant remains, that's the one. When several remain, take the lowest `product_variant_id` (oldest).

**Save summary**

| Mode | Product "Save" (`updateProduct`) | Variant card / modal actions |
|---|---|---|
| Simple | Writes product sku/price/qty, then `syncDefaultVariant` → default variant + `inventory_item` (existing) | Only "Add variant" → creates a variant and sets `type = 'configurable'` (new) |
| Configurable | Writes product sku/price (base values) + manage_stock/stock_availability; no qty; variants untouched | Create / update / delete / toggle through the variant APIs; delete promotes a new default when needed (new) |

**Steps**

1. **Migration `Version-1.1.5.ts`** (catalog): set `product.type = 'configurable'` for every product that has more than one `product_variant`, **or** a variant with options (`variant_attribute_value`), **or** a variant that isn't default. Everything else stays `'simple'`.
2. **GraphQL:** add `type: String!` to `Product` (`Product.graphql`), mapped from `product.type`.
3. **`productVariants.ts`:**
   - `createProductVariantFunc`: after the insert, `UPDATE product SET type = 'configurable' WHERE product_id = ? AND type = 'simple'`.
   - `deleteProductVariantFunc`: promote a new default when the deleted variant was the default (see above).
4. **`defaultVariant.ts` `syncDefaultVariant`:** load `product.type` and return early unless it is `'simple'`. Keep the existing `variants.length !== 1 || !is_default` check (`:108`) as a safety net.
5. **`Variants.tsx`:** add `type` to the card query. When it's `'simple'`, render the collapsed card with only "Add variant". After the create, refresh and flag (or open) the old default variant.
6. **`General.tsx` / `Inventory.tsx`:** add `type` to their queries. Both live in `productEdit+productNew`; the new page has no product, so treat it as `'simple'`.
   - General: show the base/listing hint under SKU/Price in configurable mode.
   - Inventory: don't render the `qty` session in configurable mode.
7. **Product grid type filter:** change the `type` filter in `registerDefaultProductCollectionFilters.ts:221-250` to `product.type = :value` instead of `variant_group_id`. The UI options (`Grid.tsx`) already use `simple` / `configurable`.
8. **`createProduct`:** no change. `type` uses the column default `'simple'`. Make sure `type` from the request body isn't written (the schema allows additional properties). Check that `insertProductData` only picks known columns.
9. **Manual tests:**
   - Simple product: edit price/qty → `product_variant.price` and `inventory_item.total_seats` follow (with reservations). The Variants card shows only "Add variant".
   - Add a 2nd variant → `product.type = 'configurable'`. The full list appears, the old default is flagged, General shows the base-value hint, and Inventory qty is hidden.
   - Save the product in configurable mode → variants and `product_inventory.qty` are unchanged.
   - Delete down to one variant → still configurable, list still shown, and the remaining variant is default.
   - Delete the default variant while others remain → the oldest remaining one becomes default.
   - Migration: a product with one variant that has a week option → `configurable`. A product with one plain default variant → `simple`.
   - The grid "Simple / Configurable" filter matches `product.type`.
   - Checkout and registration of a simple product still resolve the default variant.

### Notes

- The `isSimpleProduct(variants)` helper from the earlier draft is dropped. `product.type` is the single source of truth for the mode, for the card, for `syncDefaultVariant` and for the grid filter.
- In configurable mode, the "Default variant" checkbox in the modal still moves the default between variants. That no longer affects the mode.
