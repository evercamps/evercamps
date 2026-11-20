# Attribute groups stay as product kinds and are locked once variants use them

We keep attribute groups and treat each one as a kind of product (for example day camp, overnight camp or merchandise). A group decides which product attributes and variant attributes a product can have. Groups are managed on their own admin page. A product's group can change only until one of its variants has a value for a variant attribute. After that, the database blocks the change, because switching would leave variant values outside the new group and silently delete product attribute values.

## Considered Options

- **Remove attribute groups and make all attributes global.** This is the cleanest data model. We rejected it because we expect very different product kinds (camps and merchandise) that need different attributes.
- **Hide groups and put everything in group 1.** This fixes the confusion with the least work, but it keeps a concept nobody can use.
- **Let the group change freely with a warning.** We rejected it because the change destroys data without the user seeing it: the `Version-1.0.1` trigger deletes product attribute values outside the new group.

## Consequences

- The lock replaces EverShop's `variant_group` lock (trigger `PREVENT_CHANGING_ATTRIBUTE_GROUP_OF_PRODUCT_WITH_VARIANTS`), which ADR-0002 removes. The new lock is based on `variant_attribute_value`.
- A product with only a default variant that has no attribute values can still change group.
- Group 1 "Default" can't be deleted and is the starting group for new and imported products. A group that still has products can't be deleted.
- A variant attribute can't be removed from a group while variants of products in that group use it. Removing a product attribute is allowed after a confirmation that says how many product values will be deleted.
- Coupon conditions and targets on "attribute group" stay, and now mean "this kind of product".
