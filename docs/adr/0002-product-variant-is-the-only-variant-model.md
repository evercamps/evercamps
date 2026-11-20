# `product_variant` is the only variant model

EverShop models a "configurable product" as a `variant_group` of sibling `product` rows. evercamps models a variant as a `product_variant` row under one product, with its options in `variant_attribute_value` and its seats in `inventory_item`. Having both systems made "variant" mean two things. So we remove the `variant_group` mechanism completely: the table, `product.variant_group_id`, its triggers, the API routes, the GraphQL fields, the storefront sibling lookup, the cart fields and the sibling sync on product save. We could do this without converting any data because there was no production data yet and `variant_group` was empty when we decided.

## Consequences

- A product with several bookable options is always one `product` with several `product_variant` rows, never several products.
- Anything that needs "the options of this cart or order item" reads them from `variant_attribute_value`, not from `variant_group`.
