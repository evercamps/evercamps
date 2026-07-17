# Woocommerce import

Imports products from an existing WooCommerce store into EverCamps via the
WooCommerce REST API, using credentials configured on the WooCommerce
settings page. Each run pages through every WooCommerce product, maps it
(including images) to EverCamps' product shape, and creates or updates the
matching local product — a `woocommerce_product_map` table keyed by the
WooCommerce product ID means re-running an import updates existing products
instead of duplicating them. Every run is tracked as a batch with
per-product success/failure counts, and can be rolled back from the admin
API.

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
