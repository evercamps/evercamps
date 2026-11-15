# Product detail: collections on the product page + hide the lone default variant

## Context

Two `[planning]` items from `core/.docs/release-0.0.2/planning.md` (features > product detail):

1. *"It should be easier to add the product to a collection. Now I have to go to collections first
   and then add it."*
2. *"If there is only one default variant, don't show it, fill in the general fields with the data."*

The third product-detail item (move variant editing into a modal + inline enable/disable) is an
`[execute]` item being worked on in `feature/product-variant-modal`. Item 2 changes the same
file (`Variants.tsx`), so the order of work matters. See [Interaction with the variant modal branch](#interaction-with-feature-product-variant-modal).

Both items are admin UI work on the product edit page (`/products/edit/:id`,
`core/modules/catalog/pages/admin/productEdit/route.json`). Neither needs a migration.

---

## 1. Add/remove collections from the product page

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

**Save behaviour: immediate, not on product save.** This follows the same convention as the `Variants`
card (`productEdit/Variants.tsx:10-12`: "nothing in this card is posted with the product; it talks to its own API routes"):
- Inputs have no `name` and buttons are `type="button"`, so nothing gets into the `productForm` PATCH.
- Each add or remove calls the existing API straight away, shows a toast, and re-runs the card query.
- Reasons: the two APIs already exist, `updateProduct` has no collection handling, and the collection page already works this way. If we changed the product save to also sync a `collections[]` array, we'd have two write paths for the same link.
- Downside: a user might expect "Save" to undo a removal. Put "changes are saved immediately" as a subtle hint in the card.

**Steps**

1. **GraphQL: expose remove and add URLs from the product's side.**
   - In `Collection.resolvers.ts` `Product.collections` (`:110-130`), add `productUuid: product.uuid` to each returned row. (`product` is the parent; check that `uuid` is loaded by the product loader. The `Product` interface at `:26-28` only declares `productId`.)
   - In `Collection.admin.graphql`, add `removeProductUrl: String` on `Collection`. In `Collection.admin.resolvers.ts`, resolve it as
     `collection.productUuid ? buildUrl('removeProductFromCollection', { collection_id: collection.uuid, product_id: collection.productUuid }) : null`.
   - For the add action, the card uses `Collection.addProductUrl` of the collection the user picked, plus the product uuid. That means the card query needs `product { uuid }` (`productUuid` is already in context, `productEdit/index.ts:43`).
2. **Make `CollectionSelector` give back the uuid.** Change it to `onSelect(collection.collectionId, collection)` /
   `onUnSelect(collection.collectionId, collection)` and add `addProductUrl` to its query. This is backward compatible for the coupon editor, which ignores the second argument.
   Alternative: write a small product-page-specific selector (copy, ~100 lines). Reuse is preferred.
3. **Rewrite `productEdit/Collection.tsx`.**
   - Fetch the data client-side with `useQuery` on `product(id: $id) { uuid collections { collectionId uuid name editUrl removeProductUrl } }`, using `requestPolicy: 'network-only'` for refreshes. This follows the pattern in `Variants.tsx:284-308`. Keep the SSR `query` export minimal (`productId`, `uuid`).
   - Card action **"Add to collection"** opens a modal (`useModal`, same markup as `collectionEdit/Products.tsx:159-170`) with `CollectionSelector`. Set `selectedIDs` to the current `collectionId`s.
     - `onSelect` sends `POST collection.addProductUrl` with `{ product_id: product.uuid }`.
     - `onUnSelect` sends `DELETE` to the matching `removeProductUrl`.
     - Both refresh the list.
   - Each listed collection gets an "×" or "Remove" link (`type="button"`) that calls `DELETE removeProductUrl`. Ask for confirmation through `useAlertContext`, the same way `Variants.tsx:328-349` does.
   - Handle the `{ success:false, message }` error shape (it's different from the variant APIs, see above).
   - Fix the sortOrder clash with `Inventory.tsx`, e.g. Collections → `rightSide` 20.
4. **Optional: show the card on the new-product page too.** That doesn't work with immediate saves because there's no product uuid yet. Options:
   (a) leave it on edit only, which is the current behaviour and recommended for this release;
   (b) on the new page, collect the chosen collection ids in hidden `collections[]` inputs, then add them in `createProduct` after `insertProductData` (new hookable step, `core/modules/catalog/services/product/createProduct.ts:205-237`) plus `productDataSchema.json`.
   Defer (b) unless asked.
5. **Test manually:** add from the product page and check it shows in `collectionEdit/Products.tsx`. Remove from the product page and check it's gone there. Adding twice should do nothing (idempotent). Removing the last collection should show "No collections". Coupon `CollectionSelector` should still work.

### Open questions (item 1)

- Should creating a **new** collection be possible from the product page (inline "create and add")? Not proposed. `createCollection` exists, but it needs `code` + `name`.
- Is immediate save acceptable, or must the collection link follow the product's Save button? The second option means a `collections` field in `productDataSchema.json` + an `updateProductCollections` step in `updateProduct`, and the immediate APIs stay for the collection page.

---

## 2. Hide the lone default variant; general fields edit it

### Current state

**Data model**
- `product_variant.is_default` + unique partial index `PRODUCT_VARIANT_ONE_DEFAULT` (at most one default per product):
  `core/modules/catalog/migration/Version-1.1.1.ts:7-19`. The backfill (`:21-68`) makes a product's only variant the default, and creates a default variant + `inventory_item` for products that had none.
- `product_variant.status` (enable/disable per variant): `Version-1.1.3.ts:4-10`.
- GraphQL `Product.variants: [ProductVariant!]!` with `isDefault`, `status`, `options`, `usageCount`, `updateApi`, `deleteApi`: `core/modules/catalog/graphql/types/ProductVariant/ProductVariant.graphql:45-52`.

**Default-variant sync already exists (product → variant, one direction only).** `core/modules/catalog/services/product/defaultVariant.ts`
- `ensureDefaultVariant` (`:49-78`) runs from `createProduct` (`createProduct.ts:217-223`). It creates the default variant from the product's `sku`/`price`/`qty` (with `resolveVariantSku` fallback `<sku>-<productId>`, `:24-38`).
- `syncDefaultVariant` (`:89-160`) runs from `updateProduct` (`updateProduct.ts:379-385`) after `updateProductInventory`.
  - It **only** syncs when the product has exactly one variant and it is `is_default` (`:108-110`).
  - It copies `sku` and `price` (`:113-131`). It copies `qty` as `inventory_item.total_seats = qty + reserved seats` (`:133-158`), because `product_inventory.qty` is *free* seats (the legacy trigger lowers it per order) while `total_seats` is capacity.
- There is **no reverse sync**. `updateProductVariantFunc` (`core/modules/catalog/services/product/productVariants.ts:193-241`) changes only the variant. If you edit the default variant in the Variants card today, `product.sku`/`product.price`/`product_inventory.qty` go out of sync until the next product save overwrites the variant again.

**UI today: the same data is shown twice.**
- General card: `SKUPriceWeight` posts `sku` / `price` (`core/modules/catalog/pages/admin/productEdit+productNew/General.tsx:62-108`, registered at `:322-332`) with the product form.
- Inventory card: posts `qty`, `manage_stock`, `stock_availability` (`productEdit+productNew/Inventory.tsx:35-73`).
- Variants card (`productEdit/Variants.tsx`, `leftSide` sortOrder 20, edit page only):
  - Lists *all* variants, including the lone default one, which shows as "Default" with a `default` badge (`:155`, `:430-434`).
  - Has its own Title/SKU/Price/Seats/Default/Enabled form (`VariantForm`, `:162-278`), saved through `createVariantApi` / `updateApi` (`:310-326`).
  - The default variant can't be deleted while it's alone (`:465`, and the server checks it too: `deleteProductVariantFunc`, `productVariants.ts:261-281`, "A product needs at least one variant").
- `ProductEditForm.tsx` is just the `<Form method="PATCH">` wrapper (`:27-67`). The product form posts to `updateProduct`, and `syncDefaultVariant` then mirrors into the default variant.

So the backend already does what the item asks for: for a single-default product, the general fields are the source of truth and the variant follows. The missing part is the **UI**: hide the redundant card, and handle the switch between "simple" and "with variants".

### Definition: "simple product"

`variants.length === 1 && variants[0].isDefault && variants[0].options.length === 0`

The `options.length === 0` check matters. A product with one real camp week (an option such as "Week 1 zomer 2027") is a real variant, even if it's the only one. Hiding it would hide which week it is. `title` is ignored. `status` is ignored too, because in simple mode the product's own `status` (Status card) is what counts. See the open question on the default variant's `status`.

### Proposal

**Simple mode** (the condition above is true):
- The Variants card collapses to a one-line card: *"This product has no variants. Price, SKU and seats are edited in General / Inventory."* plus the **"Add variant"** action. The variant table, the attribute-group session and `VariantForm` are not rendered.
- General (`sku`, `price`) and Inventory (`qty`) stay as they are and keep posting with the product form. `syncDefaultVariant` writes them into the default variant. **No backend change is needed for the save itself.**
- Optional: under Inventory `qty`, show "Capacity: N (M reserved)" from `variants[0].totalSeats` / `usageCount`, so the free-qty versus capacity difference is visible.

**Variants mode** (two or more variants, or a single variant with options or not default):
- The Variants card shows as it does today (or as the modal version from the other branch).
- General `sku`/`price` and Inventory `qty` *stop* syncing (`defaultVariant.ts:108-110`). They become only the product's base/listing values. Make that visible:
  - Add a helper text under SKU/Price, "Base values used in listings; each variant has its own price/SKU", or make them read-only. See open question.
  - Add a helper text under Inventory qty, "Seats are managed per variant".

**Switching simple → variants ("Add variant" on a simple product)**
1. `POST createVariantApi` creates the second variant as it does today (`createProductVariantFunc`, `productVariants.ts:161-191`, `is_default: false`).
2. The existing default variant stays and becomes visible as a normal row with its current sku/price/seats. It still has no title or options, so it shows as "Default". The UI should then ask the user to edit it: open it in the editor or modal right away, or show a warning badge "give this variant a name/option".
3. The card re-queries `variants`. Since `variants.length === 2` now, it renders the full list. General/Inventory need to know about the switch too (helper text), so they also need `variants { isDefault options { optionId } }`. The simplest approach: lift the mode into a tiny shared query, or let each card run its own `useQuery` (urql caches the same query).

**Switching variants → simple (deleting down to one)**
- `deleteProductVariantFunc` lets you delete down to one variant. The remaining variant may be the default one or not.
  - If it's the default and has no options, the page drops back to simple mode. **Risk:** the General/Inventory fields show the *product's* values, which may now differ from the remaining variant's. The next product save would silently overwrite the variant with them.
  - Fix with a **reverse sync**, as a new step in `updateProductVariantFunc` / `deleteProductVariantFunc`. When, after the change, the product has exactly one variant and it is default, copy `variant.sku` → `product.sku`, `variant.price` → `product.price`, and `total_seats − reserved` → `product_inventory.qty`. The reserved-seat formula is the inverse of `defaultVariant.ts:133-158`; extract a shared helper there, e.g. `syncProductFromDefaultVariant(productId, connection)`.
  - Alternative: on the page, read the General/Inventory values from `variants[0]` in simple mode. That's fragile, because the inputs still post to `product`. Prefer the reverse sync.
- If the last remaining variant is *not* default, the page stays in variants mode. Open question: should we auto-promote it to default?

**Save summary**

| Mode | Product "Save" (`updateProduct`) | Variant card / modal actions |
|---|---|---|
| Simple | Writes product sku/price/qty, then `syncDefaultVariant` → default variant + `inventory_item` (existing) | Only "Add variant" |
| Variants | Writes product sku/price/qty; variants untouched (existing) | Create / update / delete / toggle variant through the variant APIs; afterwards, reverse-sync if back to one default variant (new) |

**Steps**
1. Extract a shared `isSimpleProduct(variants)` helper (e.g. `core/components/admin/catalog/productEdit/variants/isSimpleProduct.ts`).
2. `Variants.tsx`: in simple mode, render the collapsed card with only "Add variant". After the first create, open the default variant for editing (or flag it).
3. `General.tsx` / `Inventory.tsx`: add `variants { isDefault options { optionId } }` to their queries (both live in `productEdit+productNew`, so the new page has no product; treat it as simple). Show the variants-mode helper text, or make the fields read-only.
4. `productVariants.ts`: add the reverse sync (product ← sole default variant) after update and delete. Put the seat math in `defaultVariant.ts` next to `syncDefaultVariant`.
5. Manual tests:
   - Simple product: edit price/qty → `product_variant.price` and `inventory_item.total_seats` follow (with reservations).
   - Add a 2nd variant → the full list appears, and General shows base-value hint text.
   - Delete back to one default → simple mode, and General shows the variant's values.
   - Single variant with a week option → still shown as a variant.
   - Checkout and registration of a simple product still resolve the default variant.

### Interaction with `feature/product-variant-modal`

- That branch (the `[execute]` item: variant editing in a modal + inline enable/disable toggle) exists locally but has **no commits beyond master yet** (it points at `1690bcd`). It will rewrite `productEdit/Variants.tsx`: the `VariantForm` inline editor (`:162-278`, rendered inline at `:385-394` / `:411-424`) moves into a modal, and the list gets a per-row `status` toggle that calls `updateApi` with `{ status }`.
- **Recommended order: merge the modal branch first, then build item 2 on top of it.** The simple-mode collapse is then just a wrapper around the list. "Add variant" opens the same modal, and after the first create the default variant opens in that modal.
- The inline status toggle should **not** show in simple mode. A simple product is enabled/disabled through the product `Status` card (`productEdit+productNew/Status.tsx`). Disabling its only variant would make it unbookable while the product still looks enabled.
- The modal's "Default variant" checkbox (`VariantForm`, `:252-259`) can move the default to another variant. Then `defaultVariant.ts:108` (`variants.length !== 1 || !is_default`) decides the mode. Keep `isSimpleProduct` in one shared place so the modal branch and this work agree.
- If the modal branch has a reverse-sync need of its own (e.g. toggling status on the sole default variant), use the helper from step 4 rather than a second copy.

### Open questions (item 2)

1. In variants mode, should General `sku`/`price` be **hidden**, **read-only** (shows e.g. the lowest variant price), or **editable as a base value**? `product.price`/`product.sku` are still used by listings, the product grid (`components/admin/catalog/productGrid/rows/PriceRow.jsx`) and the legacy cart, so they can't simply disappear. Recommendation: editable, with a "base/listing value" hint, until the storefront reads variant prices.
2. In variants mode, what does Inventory `qty` mean? It no longer maps to any variant's seats. Hide it, or show the sum of variant `totalSeats` read-only?
3. When deleting down to one remaining **non-default** variant, should it be auto-promoted to `is_default` (and the page switch to simple mode)?
4. Should a simple product's default variant `status` mirror the product `status` in `syncDefaultVariant`? Today it's never touched, so it stays `true`.
5. Should the new-product page (no variants yet, `ensureDefaultVariant` runs on create) say anything about variants? Proposed: no. Variants can be added after the first save, which is the case today.
