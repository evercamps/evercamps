# Each attribute has one fixed role: product or variant

In EverShop every attribute is a product attribute, and evercamps first let any select or period attribute also be used for variants. As a result, a variant attribute such as "week" also showed up as a dropdown for the whole product. We now give each attribute exactly one role, `product` or `variant`. The product Attributes card shows only product attributes, and the Variants form offers only variant attributes from the product's attribute group.

## Considered Options

- **Role per group link (`attribute_group_link`).** The same attribute could be a variant attribute in one group and a product attribute in another. We rejected it because it's harder to explain and we have no real case that needs it.
- **No role, so select and period attributes show up in both places.** This was the old behaviour. It caused the confusing product-level dropdown.

## Consequences

- Only `select` and `period` attributes can have the `variant` role, because a variant needs exactly one value from a fixed list. Every other type is always `product`.
- An attribute's role can change only while it has no values: no `variant_attribute_value` rows and no product values. After that it's read-only.
- Existing attributes are migrated by usage: an attribute that appears in `variant_attribute_value` gets `variant`, and everything else gets `product`. The WooCommerce importer creates its variant attributes with the `variant` role.
