# Analysis: attribute groups, variant groups and product variants

Source: `core/.docs/release-0.0.2/planning.md:22` [analysis]

> It's like I cannot add a new attribute group. Do we still need this anyway? Isn't it easier to add
> the variants that we need? Why is it possible to change this on the product detail page? Changing
> variant group does not change a lot to adding a new variant.

All paths below are relative to `core/` unless stated otherwise. This is a static code analysis
(no running instance was available), so runtime claims are marked where they are inferred.

---

## 1. Three different "group" concepts

The issue mixes three different things. They have similar names but do different jobs:

| Concept | Tables | Origin | Still used by the UI? |
|---|---|---|---|
| **Attribute group** | `attribute_group`, `attribute_group_link`, `product.group_id` | EverShop core | Yes: attribute edit page, product edit "Attributes" card, product "Variants" card (read-only), coupon conditions |
| **Legacy variant group** | `variant_group`, `product.variant_group_id` | EverShop core (a "configurable product" is a set of sibling `product` rows) | **No admin UI anymore**. Backend, GraphQL, storefront and cart code still exist |
| **Product variant** (new) | `product_variant`, `variant_attribute_value`, `variant_lookup`, `inventory_item` | evercamps (`variation-plan.md`) | Yes: product edit "Variants" card, storefront variant picker, cart/order/registration |

### 1.1 Attribute group: schema

- `attribute_group` table, with group 1 = "Default" seeded: `modules/catalog/migration/Version-1.0.0.ts:84-96`.
- `attribute_group_link` (attribute ↔ group, many-to-many): `Version-1.0.0.ts:100-108`.
- `product.group_id INT DEFAULT 1`, FK `ON DELETE SET NULL`: `Version-1.0.0.ts:181,197`.
- DB triggers:
  - Group 1 cannot be deleted: `Version-1.0.0.ts:472-491` (and in the API, `api/deleteAttributeGroup/deleteAttributeGroup.ts:43-52`).
  - A product's `group_id` cannot change while it has a legacy `variant_group_id`: `Version-1.0.0.ts:496-515`.
  - Removing an attribute from a group deletes that attribute's product values for every product in the group, and deletes legacy variant groups that use it: `Version-1.0.0.ts:518-537`.
  - **On every product update, product attribute values whose attribute is not in the product's
    (new) group are deleted**: `migration/Version-1.0.1.ts:11-33`. So changing the group on the
    product page silently deletes product-level attribute values.

### 1.2 Legacy variant group: schema

- `variant_group (attribute_group_id NOT NULL, attribute_one..attribute_five)`: `Version-1.0.0.ts:128-146`.
  A variant group belongs to one attribute group, and its attributes must be in that group
  (`api/createVariantGroup/[bodyParser]saveGroup.ts:75-94`). Only `select` attributes are allowed (`:58-73`).
- `product.variant_group_id`: `Version-1.0.0.ts:179,198`. Every "variant" is a full `product` row.

### 1.3 Product variant (new model)

- `product_variant` + `variant_attribute_value (variant_id, attribute_id, option_id)` + `inventory_item`.
  The service `services/product/productVariants.ts` writes options (`writeOptions`, `:87-130`).
  It only checks that the option belongs to the attribute. **It does not check the attribute group.**

---

## 2. Can you add a new attribute group? (does it fail, and why)

### 2.1 Where it can be done

There is **no attribute-group admin page** (no grid, no menu entry, no rename/delete UI). The only
place to create a group is a small text field at the bottom of the **attribute** edit/new page:

- `modules/catalog/pages/admin/attributeEdit+attributeNew/General.tsx:365-370`: card section "Attribute Group".
- `General.tsx:66-147`: `Groups` component with a multi-select of existing groups plus an input
  "Create a new group" with a `+` link as suffix.
- `General.tsx:78-104`: `+` posts `{ group_name }` to `createGroupApi` (`url(routeId: "createAttributeGroup")`, `:402`).

The update/delete APIs (`api/updateAttributeGroup`, `api/deleteAttributeGroup`) and the GraphQL
`AttributeGroup.updateApi` (`graphql/types/Attribute/Attribute.admin.resolvers.ts:74`) exist, but
**no admin UI calls them**.

### 2.2 Backend: works on paper

- Route: `api/routes.ts:171-180` (`POST /api/attributeGroups`), handler
  `api/createAttributeGroup/[bodyParser]saveGroup.ts:21-60`: a plain `insert('attribute_group')`.
- Payload schema only requires `group_name` (`api/createAttributeGroup/payloadSchema.json`).
- The `Input` component takes `ref` as a prop (`includes/components/form/fields/Input.tsx:51,58`).
  That works on React 19 (installed: 19.2.7).

So the API should create the row. Nothing in the code shows the insert failing.

### 2.3 Why it still *feels* like it does not work (UX traps)

1. **Hard to find.** Users look for "Attribute groups" in the menu or in the attribute grid.
   It is hidden inside the attribute form.
2. **Enter submits the wrong form.** The "Create a new group" input sits inside the attribute
   `<Form>` (`attributeNew/AttributeNewForm.tsx`, `includes/components/form/Form.tsx:218`). Typing a
   name and pressing **Enter** submits the *attribute* form. The input has no `name`, so the typed
   group is silently dropped. On "New attribute" with empty fields, you get validation errors
   instead. Only clicking the small `+` creates the group.
3. **Selection is reset after create (inferred).** After a successful create, the component calls
   `reexecuteQuery({ requestPolicy: 'network-only' })` (`General.tsx:99`). While urql refetches,
   `fetching` is true, so the component renders `<p>Loading...</p>` (`:106`). That unmounts the
   uncontrolled `<Select defaultValue={groups}>` (`:117-124`). When it comes back, any groups picked
   but not saved are lost. The new group is **not** auto-selected either.
4. **A new group is empty.** A group only gets attributes when you open each attribute and tick the
   group, then save that attribute. Until then, a product in that group shows an empty
   "Attributes" table (`productEdit+productNew/Attributes.tsx:96`). The product "Variants" card
   offers no variant attributes (see §3), so it looks as if nothing happened.
5. **You cannot unlink an attribute from its last group.** `updateAttributeGroups` returns early
   when `groups` is empty (`services/attribute/updateProductAttribute.ts:121-125`).

Side note to verify (not the cause of the issue): `saveGroup` is only ordered `after: ['bodyParser']`
(`api/routes.ts:178`, same for `createVariantGroup` `:258` and `updateAttributeGroup` `:364`). Other
write routes are ordered after `escapeHtml` (e.g. `createAttribute`, `:166`). Check that `auth` still
runs before `saveGroup` in the sorted chain.

**Conclusion:** creating a group is not broken in the backend. The UI is hidden, easy to misuse
(Enter key), loses state, and a new group does nothing until attributes are linked one by one.

---

## 3. What attribute groups currently drive

| Area | Behaviour | Reference |
|---|---|---|
| Product edit/new: "Attributes" card | Dropdown `group_id` (all groups). Only the selected group's attributes are shown as fields. Switching the dropdown swaps the visible fields client-side. | `pages/admin/productEdit+productNew/Attributes.tsx:47-53, 64-70, 78-91, 96`; query `:197-226` |
| Product save | Attribute values outside the new group are **deleted by a trigger** | `migration/Version-1.0.1.ts:17-19` |
| Product edit: "Variants" card | Read-only "Attribute group: X – variant attributes: …" plus help text "Change it in the Attributes card and save the product" | `pages/admin/productEdit/Variants.tsx:364-379` |
| Variant attribute candidates | `Product.variantAttributes` = select/period attributes of the product's group **plus** attributes already used by its variants | `graphql/types/ProductVariant/ProductVariant.admin.resolvers.ts:63-105`; group label `:54-62` |
| Variant save | No group check (any attribute/option is accepted) | `services/product/productVariants.ts:87-130` |
| Attribute grid | "Groups" column + group filter | `pages/admin/attributeGrid/Grid.tsx:233,312,371`; `components/admin/catalog/attributeGrid/headers/GroupHeader.jsx` |
| Attribute collection filter `group` | | `services/registerDefaultAttributeCollectionFilters.ts:98-121` |
| Coupons | Condition / target "attribute group" uses cart item `group_id` | `modules/promotion/services/registerDefaultValidators.js:240-256`, `registerDefaultCalculators.js:165-177`; `components/admin/promotion/couponEdit/AttributeGroupSelector.jsx`; cart field `modules/checkout/services/cart/fields/cartItem/product.ts:38-42` |
| Storefront | **Nothing directly.** Product page shows `attributeIndex` values (`pages/frontStore/productView/Attributes.tsx`). The variant picker uses `bookableVariants` (`graphql/types/ProductVariant/ProductVariant.resolvers.ts:49+`), which ignores groups. | |
| WooCommerce importer | Every product gets `group_id = 1`. Every new imported attribute (e.g. `periode`/camp week) is linked to group 1. | `content/plugins/woocommerce-import/src/lib/mapProduct.ts:3-8,40`; `importVariants.ts:60-62` |

In practice everything lives in group 1 "Default". The only real job a group has today is
**filtering which attributes are shown**: product-level fields, and which attributes the variant
form offers.

---

## 4. What still depends on the legacy `variant_group`

The admin UI for legacy variant groups was replaced by the new Variants card in `546af9f` (the old
`pages/admin/productEdit/VariantGroup.tsx` was removed). The components remain as dead code:
`components/admin/catalog/productEdit/variants/*` (`CreateVariantGroup.jsx`, `Variants.tsx`, …), and
no page imports them.

Still live code that reads `variant_group` / `variant_group_id`:

- API routes `createVariantGroup`, `addVariantItem`, `unlinkVariant`, `variantSearch` (`api/routes.ts:151,252-260`).
- GraphQL `Product.variantGroupId` / `variantGroup` (`graphql/types/Product/Product.graphql:17`, `Product/Variant/Variant.resolvers.ts:43-120`), cart/order `variantGroupId` (`modules/checkout/graphql/types/Cart/Cart.graphql:55,126`, `modules/oms/graphql/types/Order/Order.graphql:44`).
- Storefront: `pages/frontStore/productView/index.ts:48-100` resolves `?attr=value` query strings to a sibling product.
- Cart item variant options: `services/registerCartItemVariantOptionsField.ts:31-41`; cart field `variant_group_id` (`checkout/services/cart/fields/cartItem/product.ts:85-88`).
- Product save: copies attributes, tax class and category to siblings (`services/product/updateProduct.ts:177-226, 318-337`).
- Product grid filter `type = simple|configurable` = `variant_group_id IS [NOT] NULL` (`services/registerDefaultProductCollectionFilters.ts:195-220`).
- Attribute delete is blocked when it is used in a variant group (`services/attribute/deleteProductAttribute.ts:32-45`).
- DB triggers in `Version-1.0.0.ts:496-537` and `Version-1.0.1.ts:20`.

Nothing in evercamps creates `variant_group` rows anymore. The importer and the new admin both use
`product_variant`. Before removal, check production with
`SELECT count(*) FROM product WHERE variant_group_id IS NOT NULL;` and `SELECT count(*) FROM variant_group;`.

---

## 5. Answering the questions in the issue

- **"Do we still need attribute groups?"** Not for camps. Today they only filter which attributes
  show up. Everything is in group 1, and no camp feature (registrations, fiscal attests, periods,
  storefront picker) needs more than one group.
- **"Isn't it easier to add the variants that we need?"** Yes. Variant options are stored per
  variant (`variant_attribute_value`) and the backend does not care about groups. The group only
  narrows the dropdowns in the variant form.
- **"Why is it possible to change this on the product detail page?"** It is an EverShop leftover
  (product "type" = attribute set). Changing it is risky: it hides fields and **deletes**
  product-level attribute values outside the new group (trigger `Version-1.0.1.ts`). For variants,
  it only changes which attributes the "Add variant" form offers. Attributes already used by
  variants stay visible (`ProductVariant.admin.resolvers.ts:63-84`). So, as noted in the issue,
  switching the group changes very little.
- **"Changing variant group"**: the user most likely means the read-only "Attribute group" section in
  the Variants card (`Variants.tsx:364-379`), which points to the group dropdown. This is about
  attribute groups, not the legacy `variant_group`, which has no UI anymore.

---

## 6. Possible solutions

### Option A: Fix and expose group management (keep the concept)

- Add an "Attribute groups" admin grid/page (create, rename, delete, pick the attributes of a group)
  using the existing APIs.
- In `General.tsx`: make the create input not submit the form on Enter (`onKeyDown` →
  `preventDefault` + `createGroup()`), auto-select the new group, and don't unmount the Select
  while refetching.

| | |
|---|---|
| Pros | Smallest conceptual change. Keeps EverShop compatibility and coupon "attribute group" conditions. |
| Cons | Keeps a concept the camps domain does not need. More UI to maintain. Does not answer "why can I change this on the product". |
| Effort | S (UX fixes only: ~0.5 day) / M (with a group page: 1-2 days) |
| Migration | None |

### Option B: Hide groups in the UI, keep the data (recommended short term)

- Remove the group dropdown from the product "Attributes" card. Always send the current `group_id`
  (or 1) as hidden. Show the attributes of group 1, or of all attributes.
- Remove the "Attribute group" section from the Variants card.
- `Product.variantAttributes`: return **all** `select`/`period` attributes (or those marked
  e.g. `use_for_variants`), not just the group's.
- Remove the "Attribute Group" section on the attribute edit page. New attributes are linked to
  group 1 automatically (so the Attributes card and the `Version-1.0.1` trigger keep working).
  `createProductAttribute` requires `groups` (`services/attribute/createProductAttribute.ts:32-38`),
  so default it to `[1]`.

| | |
|---|---|
| Pros | Fixes the confusion with little work. No schema change. No risk of losing attribute values by switching groups. Importer keeps working (it already uses group 1). |
| Cons | Dead tables/columns stay. Coupon "attribute group" condition becomes meaningless (only one group). |
| Effort | S (~1 day) |
| Migration | Optional data fix: `INSERT INTO attribute_group_link (attribute_id, group_id) SELECT attribute_id, 1 FROM attribute ON CONFLICT DO NOTHING;` and `UPDATE product SET group_id = 1 WHERE group_id IS DISTINCT FROM 1;`. Run this **before** hiding the dropdown, because the trigger deletes values outside the group on the next save. |

### Option C: Remove attribute groups and attach attributes directly to variants/products

- Drop `attribute_group`, `attribute_group_link`, `product.group_id`, the related triggers, the
  group APIs/GraphQL, the group column/filter in the attribute grid, and the coupon attribute-group
  condition.
- Product "Attributes" card shows all attributes (or a per-attribute flag, e.g. `scope: product|variant`).
  Variant form shows all select/period attributes (or a per-product chosen list, e.g. a
  `product_variant_attribute (product_id, attribute_id)` table if per-product narrowing is wanted).

| | |
|---|---|
| Pros | Cleanest model, matching `PRODUCT → PRODUCT_VARIANT → VARIANT_ATTRIBUTE_VALUE → ATTRIBUTE`. Less code. |
| Cons | Large diff across catalog, promotion, checkout cart fields, importer, triggers. `variant_group.attribute_group_id NOT NULL` FK means legacy variant groups must go first (Option D). Diverges further from upstream EverShop. |
| Effort | L (3-5 days incl. testing) |
| Migration | New migration: drop triggers `PREVENT_CHANGING_ATTRIBUTE_GROUP_OF_PRODUCT_WITH_VARIANTS`, `TRIGGER_AFTER_REMOVE_ATTRIBUTE_FROM_GROUP`, `PREVENT_DELETING_THE_DEFAULT_ATTRIBUTE_GROUP`. Redefine `update_attribute_index_and_variant_group_visibility` without the group clause. Drop FK + column `product.group_id`, then the tables. Importer: remove `group_id`/`attribute_group_link` writes (`mapProduct.ts:40`, `importVariants.ts:60-62`). Coupons using `attribute_group` conditions must be checked/converted. |

### Option D: Remove the legacy `variant_group` mechanism (independent, combinable with B or C)

- Delete dead components `components/admin/catalog/productEdit/variants/*`, the routes
  `createVariantGroup`/`addVariantItem`/`unlinkVariant`/`variantSearch`, GraphQL `variantGroup*`,
  the `productView/index.ts` sibling lookup, `registerCartItemVariantOptionsField` (replace with
  `product_variant` options if the cart needs them), the sibling sync in `updateProduct.ts`, and
  the `type` grid filter (or redefine it as "has more than one `product_variant`").
- Migration: after verifying 0 rows, drop `product.variant_group_id` and the `variant_group` table,
  and update the triggers that reference them.

| | |
|---|---|
| Pros | Removes a second, unused variant system that confuses naming ("variant group" vs "variants"). Unblocks Option C. |
| Cons | Needs a production data check. Small risk if any old EverShop data uses it. |
| Effort | M (1-2 days) |
| Migration | Data check + drop column/table/trigger clauses. If rows exist, convert each sibling product into a `product_variant` of one parent first (non-trivial; most likely not needed). |

---

## 7. Recommendation

1. **Now (release 0.0.2): Option B.** Hide the attribute-group UI (product Attributes card, Variants
   card, attribute edit page). Link all attributes to group 1. Let variant attributes come from all
   select/period attributes. Run the data fix migration first so no attribute values are deleted by
   the `Version-1.0.1` trigger. This answers the user's questions ("we don't need it, just add the
   variants") with about a day of work and no schema risk.
2. **Next: Option D.** Verify that `variant_group` is empty in production and remove the legacy
   sibling-product mechanism and its dead UI. This also fits the cleanup in `variation-plan.md`.
3. **Later, optional: Option C**, once B has run for a while and nobody misses groups (also decide
   on coupon attribute-group conditions). Skip Option A unless a real use case for several attribute
   sets appears (e.g. very different product types such as camps vs. merchandise).
