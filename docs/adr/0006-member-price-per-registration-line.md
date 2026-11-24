# A member price is a variant price chosen per registration, and every registration is its own cart line

Clubs charge members less for the same camp week. We give a variant an optional member price and use it for a registration whose participant has a membership number, entered as an extra participant field when registering. So that each child pays their own price, a product with registrations never merges cart lines: adding the same week again creates a new line with one registration, instead of raising the quantity. Orders, refunds and fiscal attests keep working per line, and a line's amount is always exactly one participant's price.

The membership number uses the extra participant field mechanism of date of birth and national number: it is kept in the registration's extra data and, when the order is placed, copied to a `membership_number` column on the participant if that is still empty. The organiser checks and corrects it there before the camp. Unlike the other extra fields it is not configured in Camp settings: the participant form shows it, optional, whenever the chosen variant has a member price, so an admin can't remove or require it. It has to stay optional because an empty number is how a customer says "not a member".

## Considered Options

- **Membership as a variant attribute (member / non-member per week).** Rejected: seats are counted per variant, so every week's seats would be split between members and non-members, and the admin would maintain twice the variants.
- **A member coupon.** Rejected: only one coupon fits in a cart, anyone who knows the code can use it, and it can't tell a member child from a non-member child in the same cart.
- **Customer groups.** Rejected: groups don't affect prices anywhere, and membership belongs to the participant, not to the customer who pays.
- **The membership number as a configurable field in Camp settings.** Rejected: an admin could remove it while variants have member prices, or make it required, which would stop non-members from registering.
- **A price per registration inside a merged line.** Rejected: order lines, refunds and fiscal attests would all have to handle registrations with different prices on one line.

## Consequences

- Two children in the same week are two cart and order lines, each with the child's name. Products without registrations still merge.
- Editing the membership number in the cart reprices that line; nothing moves between lines.
- A participant's membership number is only filled once by an order; a newer number from a later year has to be entered by the organiser.
- Member prices are a feature switch in Camp settings (#210), off by default. It is not field configuration: when on, the membership number field still follows the rule above. When off, member prices and membership numbers are ignored and hidden, but stay stored, so turning it back on restores them.
