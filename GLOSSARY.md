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

**Member price**:
The price of a variant for a registration with a membership. A variant without a member price costs the same for everyone.
_Avoid_: Member discount, club price

### Registration

**Customer**:
The person who books and pays, usually a parent, with or without an account. A customer manages one or more participants.
_Avoid_: Parent, user, member

**Participant**:
The person who attends a camp, usually a child. A participant belongs to one customer.
_Avoid_: Child, attendee, kid, surfer

**Registration**:
A participant's place on one variant, such as a specific camp week.
_Avoid_: Booking, enrolment, inscription

**Membership**:
A participant's membership of the organiser's club for one calendar year, shown by the membership number the customer enters when registering the participant. The organiser checks it.
_Avoid_: Member, lid, subscription

### Running a camp

**Camp day**:
One day between a variant's start date and end date on which the camp takes place.
_Avoid_: Session, date, occurrence

**Monitor**:
A staff member who runs a camp on site and takes attendance. A monitor is not an organiser and cannot manage the catalog or orders.
_Avoid_: Instructor, leader, teacher, coach

**Attendance**:
Whether a participant with a registration was present or absent on one camp day, recorded by a monitor.
_Avoid_: Presence, check-in, RSVP, tinker

**Absence notice**:
A customer telling the organiser in advance that a participant will not be there on a camp day.
_Avoid_: Sick note, cancellation, RSVP
