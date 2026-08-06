# Woocommerce import

Imports products and orders from an existing WooCommerce store into
EverCamps via the WooCommerce REST API, using credentials configured on the
WooCommerce settings page. Every run is tracked as a batch with
per-record success/failure counts, and can be rolled back from the admin API.

## Products

Each run pages through every WooCommerce product, maps it (including
images) to EverCamps' product shape, and creates or updates the matching
local product — a `woocommerce_product_map` table keyed by the WooCommerce
product ID means re-running an import updates existing products instead of
duplicating them.

## Orders

Each run pages through every WooCommerce order and creates the matching
local order, order items, billing/shipping addresses and (a disabled) cart
directly — it does not go through EverShop's live checkout/cart pricing
path, so the amounts stored are exactly what WooCommerce recorded at the
time, not recalculated from current catalog prices. Run the product import
first: each order line item is linked to a local product via
`woocommerce_product_map`, and an order fails to import if one of its line
items references a WooCommerce product that hasn't been imported yet.

A `woocommerce_order_map` table (keyed by the WooCommerce order ID) makes
re-running the import idempotent: existing orders only get their
status/payment/shipment state refreshed, they are not recreated or
duplicated. WooCommerce order status is mapped onto EverShop's separate
payment/shipment status axes; customers are linked by matching email to an
existing local customer, otherwise the order is imported as a guest order.

Importing order items normally triggers EverShop's automatic stock
deduction. Since product import already synced current WooCommerce stock
levels (which already reflect these historical orders), the order importer
immediately compensates for that deduction so stock isn't double-counted.

## Where it shows up

...

## Imports


## Enable the extension

Already added to `config/default.json`:

```json
{
  "system": {
    "extensions": [
      {
        "name": "woocommerce-import",
        "resolve": "content/plugins/woocommerce-import",
        "enabled": true,
        "priority": 100
      }
    ]
  }
}
```

> **Warning**
> Enabling/disabling the extension requires running `npm run build` (or restarting
> `npm run dev`) again, and the migration runs automatically the next time the app
> boots.
