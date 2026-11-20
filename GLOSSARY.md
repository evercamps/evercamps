# evercamps

A platform where parents find camps, register their children and pay for them, and where organisers run the camps.

## Language

### Catalog

**Product**:
Something that can be booked, usually a camp. It holds what all its variants have in common.
_Avoid_: Configurable product, parent product

**Variant**:
One bookable option of a product, such as a camp week or an age group, with its own price and seats. Every product has at least one.
_Avoid_: Variant group, child product, sibling product, configurable product

**Attribute group**:
A kind of product, such as "Day camp", "Overnight camp" or "Merchandise". It decides which product attributes and variant attributes a product of that kind can have. Every product belongs to exactly one.
_Avoid_: Attribute set, product type, variant group

**Variant attribute**:
An attribute whose value tells the variants of one product apart, such as week or age group. It is never filled in on the product itself.
_Avoid_: Variant group attribute, variant option

**Product attribute**:
An attribute that describes the whole product and is the same for all of its variants. It is never used to tell variants apart.
