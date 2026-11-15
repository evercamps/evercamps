# Analysis: admin-added registrations and finances

Question from `planning.md` (participant detail): *"Can you check if adding a registration to a product creates an order? What options do we have to keep the finances up to date?"*

## Short answer

**No.** Adding a registration from the participant detail page creates **only a `registration` row**. No `order`, `order_item`, `order_item_registration`, `payment_transaction`, invoice, `inventory_reservation` or `order_activity` is created, and no event is emitted. Nothing that reports on money sees the registration, and it doesn't take a seat.

## Current behaviour

### Admin flow (participant detail → "Add registration")

1. `core/components/admin/camp/participantEdit/AddRegistrations.tsx:50-62` POSTs `{ registration_product_id, registration_participant_id, product_variant_id? }` to `addRegistrationApi` = `url(routeId: "createRegistration")` (`core/modules/camp/pages/admin/participantEdit/Registrations.tsx:282`).
2. Route: `POST /registrations`, private (`core/modules/camp/api/createRegistration/route.json`). The middleware only calls the service (`createRegistration[finish].ts:6`).
3. `core/modules/camp/services/registration/createRegistration.ts`:
   - validates the participant and product ids (`:29-44`),
   - resolves the variant: the one given, otherwise the default variant (`:73-92`),
   - rejects duplicates on (participant, product, variant) (`:98-111`),
   - **inserts one `registration` row and commits** (`:46-49`, `:113-116`).

   That is all it does. `emit` is imported (`:10`) but never called. No price, payer or payment info is stored, and the `registration` table has no amount or payment columns (`camp/migration/Version-1.0.0.ts:16-23`).

### Checkout flow (for comparison)

`core/modules/checkout/services/orderCreator.ts`, in one transaction (`:312-346`):

| Step | Code | Admin flow? |
|---|---|---|
| `order` with billing address, totals, default `payment_status` `pending` / status `new` | `saveOrder` `:30-103` | No |
| `order_item` per cart line (price, discounts, tax) | `:185-191` | No |
| legacy trigger lowers `product_inventory.qty` on `order_item` insert | `checkout/migration/Version-1.0.3.ts:7-28` | No |
| participant find-or-create + `registration` | `:197-233` | Yes (only this) |
| `order_item_registration` (link + payer `customer_id` + `extra_data`) | `:239-249` | No |
| `participant.customer_id` set if empty | `:251-257` | No |
| `inventory_reservation` (committed seat hold) | `saveInventoryReservations` `:269-295` | No |
| `order_activity` "Order created" | `:297-306` | No |

After that, the payment method updates the payment status. COD emits `order_placed` (`cod/api/createOrder/[placeOrder]addOrderPlacedEvent.ts:10-17`), and the admin "Capture" sets the order to `paid` and writes a `payment_transaction` with `transaction_type: 'offline'` (`cod/api/codCapturePayment/[bodyParser]capture.ts:12-46`). Mollie and Stripe do the same through their webhooks. The available payment statuses are `pending` (the default), `paid` and `canceled` (`oms/bootstrap.ts:196-216`). The order status is derived from the payment and shipment statuses through `psoMapping` (`:244-251`).

## Consequences of an admin-added registration

| Area | Effect |
|---|---|
| **Revenue / dashboard** | Not counted. `salestatistic` sums `order.grand_total` (`oms/api/salestatistic/loadData.ts:89-94`), and `lifetimesales` reads `order` only (`oms/api/lifetimesales/loadData.ts:20-45`). Not in the order list. Nothing records what was charged, whether it was paid, or who paid. |
| **Fiscal attests (belgian-administration)** | The amount and payer come from `order_item_registration → order_item → order` (`collectAttestCandidates.ts:104-116`). Without that link, the payer falls back to `participant.customer_id` (`:121-135`, `:201-208`) and the registration gets a **blocking `no_amount` issue** (`buildAttests.ts:288`) until the admin enters an amount override. It still works, but every admin registration means manual work at attest time, and the payer is only right if the participant is linked to the right customer. |
| **Capacity** | No `inventory_reservation` is written, and the `product_inventory.qty` trigger doesn't fire. Free seats are calculated as `total_seats − SUM(seats_held)` (`checkout/bootstrap.ts:55-90`, `catalog/graphql/types/ProductVariant/ProductVariant.resolvers.ts:91-124`), so this child isn't counted and the webshop can **overbook**. |
| **Customer emails** | Nothing is sent, but nothing is sent for checkout orders either. `order_placed` is emitted, but there is no subscriber or mailer in core or the plugins. So there is no difference today. Any order email added later would skip admin registrations. |
| **Customer account** | No order appears in the parent's account, and `participant.customer_id` isn't set. |
| **Delete** | `deleteRegistration` removes the row only. There is nothing financial to reverse, and nothing to refund or credit. |

## Options

### A. Create an admin order (manual / offline payment): recommended

The modal becomes "Add registration (creates order)". The admin picks the variant, the paying customer (default `participant.customer_id`), a price (pre-filled with the variant price and editable for sibling or discount cases), and a payment state: **Unpaid (pending)** or **Paid offline (cash/transfer)**. A new `createAdminOrder` service reuses the `orderCreator` building blocks without a cart. It writes:
- an `order` (payment_method `manual`/`cod`, billing address from the customer's default address),
- one `order_item`,
- the `registration` and an `order_item_registration` row (with `customer_id`),
- an `inventory_reservation`,
- an `order_activity` row ("Created by admin").

For "paid", it calls `updatePaymentStatus(..., 'paid')` and writes a `payment_transaction` with `transaction_type: 'offline'`, the same as the COD capture. If the order reuses `payment_method = 'cod'`, a pending order can later be marked paid with the existing capture button.
- Pros: one source of truth. Revenue, attests (amount and payer, no override), capacity and the customer's order history all work with no special cases. It matches the order-based design the attest plugin already uses.
- Cons: it needs a customer and a billing address, so there must be a fallback when the participant has no customer (a guest billing name). The `orderCreator` helpers have to be refactored so they don't depend on `Cart`. Order numbers, totals and tax must match checkout.
- Effort: **M (about 2–3 days)**.

### B. Registration only, with a "free / offline" flag and amount

Add `source`, `price`, `payment_status`, `payer_customer_id` and `note` to `registration`, and write an `inventory_reservation`. This needs either a nullable `order_id` or a new `registration_id` column on the reservation.
- Pros: a small UI change, and it suits genuinely free spots.
- Cons: it creates a second, parallel model for money. Every report, the order list and `collectAttestCandidates` would need extra queries or UNIONs, and it drifts away from the order-based design.
- Effort: **S–M (about 1–2 days)**, plus more each time a report has to learn about it.

### C. Create the order and send a payment link (Mollie/Stripe)

Option A with a `pending` order, plus a "Pay now" link to the parent. The existing webhook marks the order `paid`.
- Pros: the money comes in through the normal provider and is reconciled automatically.
- Cons: it needs a mail system, which doesn't exist yet, and a frontstore page for paying an existing order, because checkout always starts from a cart.
- Effort: **L (about 4–6 days)** on top of A.

### D. Keep as is, reconcile later

Treat admin registrations as off the books. Enter amounts as overrides at attest time, and lower `total_seats` by hand.
- Pros: no work now.
- Cons: revenue figures stay wrong, the overbooking risk stays, and payment information lives outside the system. Every attest season brings manual work and a risk of wrong attests.
- Effort: **0**, but the manual cost comes back every year.

| | Revenue | Attests | Capacity | Effort |
|---|---|---|---|---|
| A. Admin order | yes | automatic | yes | M |
| B. Flag on registration | extra work per report | plugin change needed | yes (with change) | S–M |
| C. Order + payment link | yes | automatic | yes | L |
| D. Reconcile later | no | manual override | no | 0 |

## Recommendation

Go with **A** in release 0.0.2:
1. Turn admin "Add registration" into "create admin order". Fields: customer (default `participant.customer_id`), price (pre-filled and editable; 0 is allowed), and payment state *Unpaid* / *Paid offline*. A free spot is an order with total 0 marked paid, so option B isn't needed as a separate model.
2. Always write an `inventory_reservation`. This alone fixes the overbooking risk and is worth doing first.
3. Show the linked order number on the participant's registration row, and use the existing offline capture to mark an order paid.
4. Plan **C** once transactional emails exist.

Quick win if A doesn't fit in 0.0.2: write an `inventory_reservation` in `createRegistration` (this needs a reservation that works without an `order_id`). Also show a warning in the modal that no order is created, so the amount has to be entered as an override at attest time.
