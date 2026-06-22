# Configurable Products — Migration Proposal

## Problem

The codebase currently has two partial mechanisms for product variation, neither of which works well for camp registration:

1. **Variant groups** — Each combination of attributes (e.g. Period × Age Group) becomes a separate child product with its own SKU and product page. This pollutes the admin product list, requires managing N×M products for every camp, and is confusing to operate.

2. **Custom options** — A database schema (`product_custom_option`, `product_custom_option_value`) exists and the frontend renders a placeholder component, but the GraphQL resolver returns an empty array and cart pricing ignores it entirely. It was never completed.

What's missing is a clean, camp-friendly flow where:
- An admin defines a camp once as a single product
- The admin sets selectable dimensions (e.g. "Period", "Age Group") with per-value pricing and stock
- A visitor picks their options on the product page and the price updates live
- The cart and order retain which options were selected

---

## Proposed Model

### Product type

`product.type` already exists with a default of `'simple'`. Configurable products set `type = 'configurable'`. No schema change to the `product` table needed.

### New tables

```sql
-- An option dimension on a product (e.g. "Period", "Age Group")
CREATE TABLE product_option (
  product_option_id   INT          NOT NULL AUTO_INCREMENT,
  product_id          INT          NOT NULL,
  label               VARCHAR(255) NOT NULL,         -- "Period"
  sort_order          INT          NOT NULL DEFAULT 0,
  is_required         TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (product_option_id),
  CONSTRAINT fk_product_option_product
    FOREIGN KEY (product_id) REFERENCES product (product_id)
    ON DELETE CASCADE
);

-- A selectable value within an option (e.g. "Week 1: July 7–11")
CREATE TABLE product_option_value (
  product_option_value_id INT           NOT NULL AUTO_INCREMENT,
  product_option_id       INT           NOT NULL,
  label                   VARCHAR(255)  NOT NULL,         -- "Week 1: July 7–11"
  price_type              VARCHAR(10)   NOT NULL DEFAULT 'fixed',
  -- 'fixed'     → this value sets the absolute price for the cart item
  -- 'surcharge' → adds to the product base price
  price                   DECIMAL(12,4) NOT NULL DEFAULT 0,
  qty                     INT           NULL,              -- NULL = unlimited
  sort_order              INT           NOT NULL DEFAULT 0,
  status                  TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (product_option_value_id),
  CONSTRAINT fk_pov_option
    FOREIGN KEY (product_option_id) REFERENCES product_option (product_option_id)
    ON DELETE CASCADE
);
```

### Price semantics

When a customer has selected values for all options:

- If **any** selected value uses `price_type = 'fixed'`: the item price equals the **sum** of all fixed-price values (allowing independent per-dimension pricing). No base product price is used.
- If **all** selected values use `price_type = 'surcharge'`: the item price equals `product.price + sum(all surcharge prices)`.
- If the product has no options selected or is a simple product: fall back to `product.price`.

This lets you model two common patterns without extra complexity:
- **Period-only pricing**: One option "Period" with fixed prices per week — the week selected IS the price.
- **Add-ons**: Base camp price on the product, with surcharge values (e.g. "Lunch package +€5/day").

### Cart storage

`cart_item` already has a `selected_options` text column (currently used by the old variant system as `variant_options`). Repurpose it for configurable product selections:

```json
[
  {
    "option_id": 3,
    "option_label": "Period",
    "value_id": 12,
    "value_label": "Week 1: July 7–11",
    "price_type": "fixed",
    "price": 350.00
  },
  {
    "option_id": 4,
    "option_label": "Age Group",
    "value_id": 17,
    "value_label": "Juniors (8–12 yrs)",
    "price_type": "surcharge",
    "price": 0.00
  }
]
```

The final `cart_item.product_price` is computed server-side from these values at add-to-cart time. The JSON is stored for display in cart, order confirmation, and admin order view.

---

## Implementation Steps

### Step 1 — Database migration

**File:** `packages/evercamps/src/modules/catalog/migration/Version-1.0.3.js`

Create `product_option` and `product_option_value` tables as defined above. This migration is purely additive — no existing tables are altered.

### Step 2 — GraphQL schema

**Files:** `packages/evercamps/src/modules/catalog/graphql/types/Product/Option/`

```graphql
# ProductOption.graphql

type ProductOption {
  optionId: ID!
  label: String!
  sortOrder: Int!
  isRequired: Boolean!
  values: [ProductOptionValue]!
}

type ProductOptionValue {
  valueId: ID!
  label: String!
  priceType: String!   # 'fixed' | 'surcharge'
  price: Float!
  qty: Int             # null = unlimited
  sortOrder: Int!
  status: Boolean!
}

extend type Product {
  options: [ProductOption]
}
```

**Resolver** (`ProductOption.resolvers.js`): query `product_option` joined with `product_option_value` by `product_id`. Mirror the pattern in `Variant.resolvers.js` — a simple join query, results grouped by option.

### Step 3 — Admin API routes

Under `packages/evercamps/src/modules/catalog/api/`:

| Route | Method | Purpose |
|-------|--------|---------|
| `createProductOption/[bodyParser.js, route.ts]` | POST | Insert into `product_option` |
| `updateProductOption/[bodyParser.js, route.ts]` | POST | Update label / sort_order / is_required |
| `deleteProductOption/[route.ts]` | DELETE | Delete option + cascade values |
| `createProductOptionValue/[bodyParser.js, route.ts]` | POST | Insert into `product_option_value` |
| `updateProductOptionValue/[bodyParser.js, route.ts]` | POST | Update label, price, qty, status |
| `deleteProductOptionValue/[route.ts]` | DELETE | Delete single value |

Follow the shape of the existing `createVariantGroup` / `addVariantItem` routes — `bodyParser.js` validates input with JSON schema, `route.ts` calls a service function and emits an event.

Register routes in `packages/evercamps/src/modules/catalog/bootstrap/routes.ts` alongside the existing catalog API routes.

### Step 4 — Admin UI

**New directory:** `packages/evercamps/src/components/admin/catalog/productEdit/options/`

**`Options.jsx`**
- Loads `product.options` from GraphQL
- Shows a list of option dimensions (e.g. "Period", "Age Group")
- "Add option" button → inline form for label + is_required
- Each option row is expandable to show its values (`OptionValues.jsx`)
- Delete button per option

**`OptionValues.jsx`**
- Table of values for a given option: label, price type toggle, price input, qty input, status toggle
- "Add value" row at the bottom
- Inline save per row (follow pattern of existing `EditVariant.jsx` inline edit)

**Integration point:** `packages/evercamps/src/components/admin/catalog/productEdit/index.jsx`
- Add an "Options" tab next to the existing "Variants" tab
- Show the tab (and render `<Options />`) when `product.type === 'configurable'`
- Add a "Product type" toggle (Simple / Configurable) in the General tab that controls this

### Step 5 — Frontend product page

**New file:** `packages/evercamps/src/modules/catalog/pages/frontStore/productView/ConfigurableOptions.jsx`

Responsibilities:
- Render one `<select>` per `product.options` dimension
- On change: recompute display price from selected values using the price semantics defined above
- Expose selected values to the parent form so they are submitted with add-to-cart
- Show "Select [option label]" as the default empty option
- Disable the "Add to cart" button until all required options are chosen

**Integration point:** `packages/evercamps/src/modules/catalog/pages/frontStore/productView/index.jsx`
- Conditionally render `<ConfigurableOptions />` when `product.type === 'configurable'` and `product.options.length > 0`
- Pass a callback to receive the current selection and update the displayed price

### Step 6 — Cart: addCartItem

**File:** `packages/evercamps/src/modules/checkout/services/addCartItem.ts`

Changes:
1. Accept an optional `selectedOptions: SelectedOption[]` parameter where `SelectedOption = { valueId: number }`.
2. For configurable products: validate that all required options have a value; reject if not.
3. Load full `product_option_value` rows for each `valueId` — verify they belong to this product, are active, and have sufficient stock.
4. Compute final price using the price semantics above.
5. Check per-value qty: query `SUM(qty)` of existing `cart_item` rows for this product+valueId combination and compare against `product_option_value.qty`.
6. Serialize the selection + labels + prices into JSON and store in `cart_item.selected_options`.
7. Store the computed price in `cart_item.product_price`.

Define a TypeScript interface in the same file or a nearby types file:

```ts
interface SelectedOption {
  valueId: number;
}

interface StoredOptionSelection {
  option_id: number;
  option_label: string;
  value_id: number;
  value_label: string;
  price_type: 'fixed' | 'surcharge';
  price: number;
}
```

### Step 7 — Display in cart and orders

`cart_item.selected_options` is already stored as text. Add display of these selections:

- **Mini cart / cart page**: Parse the JSON and render each selection as `Option label: Value label` below the product name. Follow how the existing `variant_options` field is displayed in cart item components.
- **Order confirmation page** and **admin order view**: Same — parse and list the selections. No schema change to `order_item` is needed; the same `selected_options` field exists there (or should be copied from `cart_item` at order creation time).

Check `packages/evercamps/src/modules/checkout/services/placeOrder.ts` (or equivalent) to confirm `selected_options` is copied from `cart_item` to `order_item` — if not, add that copy step.

### Step 8 — (Optional) Migration helper for existing variant groups

If any existing products use the old variant group system and should move to configurable options, a one-time migration helper can:

1. For each `variant_group`, determine the defining attributes (`attribute_one` … `attribute_five`).
2. Create one `product_option` per attribute.
3. For each unique attribute option used across child products: create one `product_option_value`, taking `price` and `qty` from the first child product that uses that option value.
4. Set the parent product `type = 'configurable'`.
5. Optionally soft-delete or unlink the child products.

This can be a one-off Node script rather than a versioned migration, since the decision of which products to convert is editorial.

---

## What Stays Untouched

- **`variant_group` / `variant_group_id`** — the existing tables, API routes, admin components, and GraphQL types remain unchanged. Any products currently using variant groups continue to work.
- **`product_custom_option` / `product_custom_option_value`** — the schema stays; the incomplete GraphQL resolver stays as-is. This is a separate concern and can be wired up independently later.

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `modules/catalog/migration/Version-1.0.3.js` | **Create** — `product_option` and `product_option_value` tables |
| `graphql/types/Product/Option/ProductOption.graphql` | **Create** — GraphQL types + Product extension |
| `graphql/types/Product/Option/ProductOption.resolvers.js` | **Create** — resolver for `Product.options` |
| `modules/catalog/api/createProductOption/` | **Create** — bodyParser + route |
| `modules/catalog/api/updateProductOption/` | **Create** — bodyParser + route |
| `modules/catalog/api/deleteProductOption/` | **Create** — route |
| `modules/catalog/api/createProductOptionValue/` | **Create** — bodyParser + route |
| `modules/catalog/api/updateProductOptionValue/` | **Create** — bodyParser + route |
| `modules/catalog/api/deleteProductOptionValue/` | **Create** — route |
| `components/admin/catalog/productEdit/options/Options.jsx` | **Create** |
| `components/admin/catalog/productEdit/options/OptionValues.jsx` | **Create** |
| `components/admin/catalog/productEdit/index.jsx` | **Modify** — add Options tab, product type toggle |
| `pages/frontStore/productView/ConfigurableOptions.jsx` | **Create** |
| `pages/frontStore/productView/index.jsx` | **Modify** — conditionally render ConfigurableOptions |
| `modules/catalog/bootstrap/routes.ts` | **Modify** — register new API routes |
| `modules/checkout/services/addCartItem.ts` | **Modify** — accept + validate + price selectedOptions |

---

## Verification Checklist

- [ ] Run the migration; confirm `product_option` and `product_option_value` tables exist
- [ ] Create a product with `type = 'configurable'` in the admin; confirm Options tab appears
- [ ] Add a "Period" option with two fixed-price values; add an "Age Group" option with no price delta
- [ ] Verify options and values are saved and listed correctly in the admin
- [ ] On the product page: confirm two dropdowns appear; selecting a period value updates the displayed price
- [ ] Confirm the add-to-cart button is disabled until both required options are selected
- [ ] Add to cart; confirm `cart_item.selected_options` stores the selection JSON and `product_price` matches
- [ ] Set a `qty = 2` on one value; add 2 to cart; attempt a third — confirm the error
- [ ] Complete checkout; confirm order item shows selected options in order summary and admin order view
- [ ] Confirm existing simple products and variant-group products are unaffected
