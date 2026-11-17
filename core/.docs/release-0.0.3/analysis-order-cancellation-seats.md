# Analysis: order cancellation, failed payments, seats and registrations

Items from `planning.md` (fixes > orders):

1. *"A failed or cancelled payment keeps the registration and its seat, and cancelling an order doesn't free the seat either."*
2. *"Cancelling an order can delete the same child's registration for another week."*

Both items go through the same code (`orderCreator` writes the rows, `cancelOrder` is supposed to undo them), so they are covered in one document. Part 1 is item 1, part 2 is item 2, and the solution in part 3 covers both.

## Short answer

- **Item 1 (seats):** a seat is an `inventory_reservation` row per order line. **No code ever deletes or releases one.** Not on a failed, cancelled or expired payment (Mollie, Stripe, PayPal), not on an admin cancel, not on a refund, and not when the admin deletes a registration. Free seats are `total_seats − SUM(seats_held)`, so every failed or cancelled order holds its seats for good. The registration also stays on a failed payment. When the customer retries, the reactivated cart creates a **second order and a second registration** for the same child and week.
- **Item 2 (wrong registrations deleted):** `cancelOrder.removeRegistrationsAndParticipants` finds the participant **by first and last name only**, then deletes **every registration of that participant for that product, whatever the variant (week)**. It also deletes the participant once they have no registrations left. Since 0.0.2, weeks are variants of one camp product, so cancelling the week-2 order also deletes the paid week-1 registration from another order. On top of that, the lookup query has a join bug and loops over **every `order_item_registration` row in the database**, not only the rows of this order.
- **Recommendation:** a single `releaseOrder` service that (a) deletes the order's `inventory_reservation` rows and (b) marks the order's registrations `canceled`, found through `order_item_registration.registration_id` and never by name. Call it from `cancelOrder` and from a hook on payment status `canceled`/`failed`. Never delete participants. Add a `registration.status` column instead of hard deletes. Details are in part 3.

---

## Part 1: failed or cancelled payment keeps the registration and the seat

### What the checkout writes

The order is created **before** payment, for every payment method. `core/modules/checkout/services/orderCreator.ts`, in one transaction (`:312-346`):

| Row | Code | Undone on failure/cancel? |
|---|---|---|
| `order`, payment `pending`, status `new` | `saveOrder` `:30-103` | status changes only |
| `order_item` per cart line | `:185-191` | no |
| legacy trigger: `product_inventory.qty -= qty` | `checkout/migration/Version-1.0.3.ts:7-28` | only on admin cancel (`reStockAfterCancel`) |
| participant find-or-create (name + uniqueness fields) | `:197-225` | admin cancel deletes it, see part 2 |
| `registration` (participant, product, **variant**) | `:227-233` | admin cancel only, and wrongly (part 2) |
| `order_item_registration` (link + payer + extra data) | `:239-249` | only by FK cascade when the registration is deleted |
| `inventory_reservation` (`seats_held = qty`, `expires_at NULL`) | `saveInventoryReservations` `:269-295` | **never** |
| cart disabled (`status 0`) | `:22-28`, `:338` | re-enabled on failure (Mollie, Stripe, PayPal) |

### How free seats are computed

All three places count **every** reservation with `expires_at IS NULL`, whatever the order's status:

- Cart and checkout check: `checkout/bootstrap.ts:80-91` (`reserved_seats`) → `checkout/services/cart/fields/cartItem/inventory.ts:17-26` (`total_seats − reserved_seats`, error "out of stock" / "not enough stock").
- Product page week picker: `catalog/graphql/types/ProductVariant/ProductVariant.resolvers.ts:90-98` and `:123-125` (`availableSeats`, `soldOut`).
- Admin product save (simple products): `catalog/services/product/defaultVariant.ts:144-169` sets `total_seats = posted qty + reserved`.

`product_inventory.qty` only counts for products without a resolvable variant (`inventory.ts:21`), so restocking it (what `cancelOrder` does) frees nothing in practice.

### Per payment method

| Method | Event | Code | Payment status set | Registration | Seat | Cart |
|---|---|---|---|---|---|---|
| Mollie | webhook `failed` / `expired` | `mollie/api/mollieWebhook/[bodyJson]webhook.ts:137-147` | `canceled` | kept | kept | — |
| Mollie | webhook `canceled` | `…webhook.ts:150-159` | `canceled` | kept | kept | — |
| Mollie | return page, `failed`/`canceled`/`expired` | `mollie/pages/frontStore/mollieReturn/index.ts:68-89` | `canceled` (`:78`) | kept | kept | **re-enabled** (`:74-77`) |
| Mollie | return page, `open`/`pending` (customer went back) | `mollieReturn/index.ts:60-66` | stays `pending` until Mollie expires it | kept | kept | — |
| Stripe | return page, not succeeded | `stripe/pages/frontStore/stripeReturn/index.ts:77-82` | `failed` | kept | kept | **re-enabled** |
| Stripe | webhook `payment_intent.canceled` | `stripe/api/stripeWebHook/[bodyJson]webhook.ts:165-175` | `canceled` | kept | kept | — |
| Stripe | `payment_intent.payment_failed` | not handled (`:177-179`) | — | kept | kept | — |
| PayPal | cancel page | `paypal/pages/frontStore/paypalCancel/index.js:13-31` | **stays `pending`** | kept | kept | **re-enabled** |
| PayPal | capture error on return | `paypal/pages/frontStore/paypalReturn/index.js:56-58` | stays `pending` | kept | kept | — |
| COD | never fails online; admin captures or cancels | `cod/api/codCapturePayment/[bodyParser]capture.ts` | — | kept | kept | — |

The only reactions to a `canceled` payment status are `hookAfter('changePaymentStatus')` handlers:
- oms recomputes the order status (`oms/bootstrap.ts:295-308`). `canceled:pending` maps to **`processing`** (`:255`), so a failed Mollie order shows as "Processing" in the admin. Stripe's `failed:*` maps to `new` (`stripe/bootstrap.ts:36`).
- Mollie, Stripe and PayPal cancel or void the payment at the provider (`mollie/bootstrap.ts:13-21`, `stripe/bootstrap.ts:46-58`, `paypal/bootstrap.ts:9-22`).

Nothing touches `registration` or `inventory_reservation`. No order events other than `order_placed` exist, and there are no subscribers for them, so nothing else can react either.

### Retrying after a failed payment ("re-paying")

- The failed order **cannot be paid again**: `mollieCreatePayment` only accepts orders with `payment_status = 'pending'` (`mollie/api/mollieCreatePayment/mollieCreatePayment.ts:18-23`), and the failed order is `canceled`.
- Instead, the return page re-enables the **same cart** and sends the customer to it (`mollieReturn/index.ts:74-77`, `:86`). Checking out again creates a **new order** with a **new registration and a new reservation**. The child then has two registrations for the same week (one on a `canceled` order, one on a `paid` order), and the week holds two seats.
- **Last seat:** the reactivated cart's seat check counts the failed order's reservation (`inventory.ts:20`). If the failed order took the last seat, the retry is refused with "This item is out of stock", and the customer is locked out by their own failed payment.
- Checkout has **no duplicate-registration check**, so the second registration is accepted. The only duplicate check is in the admin `createRegistration` (`camp/services/registration/createRegistration.ts:98-111`). There, the stale registration of the failed order blocks the admin from adding the child to that week manually ("Registration already exists").

### Admin cancel doesn't free the seat

`oms/services/cancelOrder.ts` (`:128-173`) sets payment and shipment status to `canceled`, adds an activity, runs `reStockAfterCancel` and `removeRegistrationsAndParticipants`. Nothing removes the `inventory_reservation` rows (they only cascade when the **order** is deleted, `oms/migration/Version-1.0.5.ts:20`).

- `reStockAfterCancel` (`:56-70`) only does `product_inventory.qty += qty`. It ignores `manage_stock` and the `oms.order.reStockAfterCancellation` config flag (`oms/bootstrap.ts:258`). It is never conditional.
- **Side effect:** for simple products, the next admin save of the product sets `total_seats = qty + reserved` (`defaultVariant.ts:164-169`). The restocked qty plus the still-held reservation then shows the seat as free, but **inflates `total_seats` by one per cancelled seat**. Once reservations are released properly, those products will be overbooked by that amount. See the data clean-up section.

### Related cases

| Case | What happens today |
|---|---|
| **Paid order** | Not cancelable: `paid.isCancelable = false` (`oms/bootstrap.ts:208`, checked in `cancelOrder.ts:32-37`). |
| **Fully refunded order** (Mollie refund webhook sets `refunded`, `mollieWebhook:91-97`) | `refunded:*` → order status `closed` (`stripe/bootstrap.ts:37`). `cancelOrder` then fails: the `changePaymentStatus` hook throws "Order is already closed" (`oms/bootstrap.ts:301-303`). **A refunded camp can never free its seat or registration** except by deleting the registration by hand, which still doesn't free the seat. |
| **Partially refunded** | Status `processing`. It can be cancelled, but the cancel overwrites `payment_status` `partial_refunded` with `canceled`. |
| **Partial cancel** (one child or one week of a multi-line order) | Not supported. Cancel is whole-order only. The only tool is deleting the registration. |
| **Admin "delete registration"** (registration grid, `camp/services/registration/deleteRegistration.ts:12-14`) | Deletes the row. The FK cascade deletes its `order_item_registration` (`oms/migration/Version-1.0.1.ts:10-13`), plus the fiscal payer, override and exclusion rows (`belgian-administration/src/migration/Version-1.2.0.ts:69,81`, `Version-1.5.0.ts:11`). **The reservation stays**, because it is per order line, not per registration. The order loses the child's name in the order detail. |
| **Abandoned pending order** (customer closes the browser before or at the provider, PayPal cancel) | Stays `pending` with seat and registration indefinitely. There is no cron or TTL infrastructure in core. Mollie eventually sends `expired` (method-dependent), PayPal and COD never do. |
| **Late payment after a cancel** (Mollie `paid` webhook on an order the admin cancelled) | The hook throws "Order is already canceled", the webhook returns 400 and Mollie keeps retrying. The money is received but the order stays cancelled. Rare, but it must be handled if a release on cancel becomes automatic. |
| **Fiscal attests** (`belgian-administration`) | Candidates are **all** registrations (`collectAttestCandidates.ts:35-46`), joined to their order for amount and payer (`:103-118`). Registrations on unpaid orders (`pending`, `canceled`, `failed`) get an `unpaid` warning and are left out (`buildAttests.ts:152`, `:210-214`), unless the admin entered an amount override, in which case they are **included**. So failed orders produce noise warnings, and a stale override on a cancelled registration would produce a wrong attest. Registrations deleted by `cancelOrder` (part 2) disappear from attests entirely, including the wrongly deleted paid ones. |
| **WooCommerce import** | Woo `cancelled`, `refunded` and `failed` orders are imported as `canceled`/`canceled` (`woocommerce-import/src/lib/mapOrder.ts:20-22`), but their participants and registrations are still created and linked (`runOrderImport.ts:432`, `:513`). Imported orders have no reservation, but the qty trigger fires on their `order_item` insert. Existing data therefore already contains active-looking registrations on cancelled orders. |

---

## Part 2: cancelling an order deletes the child's other week

### The code

`core/modules/oms/services/cancelOrder.ts:72-112`:

```ts
const orderItemRegs = await select()
  .from('order_item_registration')
  .leftJoin('order_item')
  .on('order_item.order_item_id', '=', 'order_item_registration.order_item_id')
  .and('order_item.order_item_order_id', '=', orderID)      // (1)
  .execute(connection, false);

for (const reg of orderItemRegs) {
  const participant = await select().from('participant')
    .where('first_name', '=', reg.first_name)                // (2)
    .and('last_name', '=', reg.last_name)
    .load(connection, false);
  if (participant) {
    await del('registration')
      .where('registration_participant_id', '=', participant.participant_id)
      .and('registration_product_id', '=', reg.product_id)    // (3)
      .execute(connection);
    const remainingRegs = /* all registrations of participant */;
    if (remainingRegs.length === 0) {
      await del('participant')...                             // (4)
    }
  }
}
```

### Four defects

1. **The order filter is in the `ON` clause of a `LEFT JOIN`, not in `WHERE`.** In the query builder, `.on()` returns the join's ON node and `.and()` adds to it (`node_modules/@evershop/postgres-query-builder/dist/index.js:265-272`, `:200-203`). The SQL becomes `SELECT * FROM order_item_registration LEFT JOIN order_item ON oi.order_item_id = oir.order_item_id AND oi.order_item_order_id = <id>`, with no WHERE. It returns **every `order_item_registration` row in the database**. For rows of other orders, the `order_item` columns are NULL, so `reg.product_id` is NULL. Their `DELETE … registration_product_id = NULL` matches nothing, but the participant lookup (2) and the participant delete (4) still run for them. Cost: about 3 queries × all registrations ever, inside one transaction, and it grows with every order (and with the Woo import).
2. **The participant is found by name only.** `load()` adds `LIMIT 1` with no ORDER BY. The checkout identifies a participant by name **plus the configured uniqueness fields** (`orderCreator.ts:197-204`, for example birth date or national number). Cancel ignores those, so with two children of the same name it picks either one. The registration has the exact participant (`order_item_registration.registration_id → registration.registration_participant_id`), but this code doesn't use it.
3. **The registration delete matches participant + product, without variant and without order.** Since 0.0.2, camp weeks are variants of one product (`registration.product_variant_id`, `camp/migration/Version-1.0.3.ts`, `Version-1.0.4.ts`). This deletes the child's registrations for **all weeks of that camp, from all orders**.
4. **The participant is deleted when no registrations remain.** This removes a parent-managed record (national number, extra fields, customer link). `fiscal_attest.participant_id` of attests already issued is set to NULL (`belgian-administration/src/migration/Version-1.2.0.ts:33`).

Every registration delete cascades to `order_item_registration`, `fiscal_attest_payer`, `fiscal_attest_amount_override` and `fiscal_attest_exclusion`, so the damage spreads beyond the registration itself.

### Exact wrong scenarios

| # | Setup | Admin action | Result |
|---|---|---|---|
| A | Emma Peeters: **week 1** of "Zomerkamp" in order #10001 (paid), **week 2** of the same camp in order #10002 (pending). | Cancel #10002 | Both of Emma's Zomerkamp registrations are deleted (week 1 too). #10001's `order_item_registration` row and fiscal payer and override rows cascade away. Emma has no registrations left, so **Emma is deleted**. #10001 stays paid, its seat stays held, the child is gone from the week-1 list, and **no attest for week 1**. |
| B | Mollie payment of #10002 (Emma, week 2) failed. The customer retried and paid in #10003 (Emma, week 2). | Cleans up by cancelling #10002 | Emma's week-2 registration from the **paid** #10003 is deleted, because it has the same participant and product. This is the most likely real-world trigger: admins cancel failed orders. |
| C | Two different children named "Lucas Janssens" (different birth dates), each with their own Zomerkamp registration. | Cancel Lucas A's order | Name lookup returns either Lucas. If it returns Lucas B, **B's registration is deleted** and A's stays. |
| D | Any participant whose name appears in an `order_item_registration` row (of any order) and who currently has no registrations. For example legacy rows with `registration_id` NULL, or a same-name child. | Cancel **any** order | That participant is deleted, even though the cancelled order has nothing to do with them (defect 1 + 4). |

Weeks set up as separate products (pre-0.0.2 data) are not hit by A and B, but they are still exposed to C and D.

---

## Part 3: solution options

### Decision 1: what happens to the registration

| Option | How | Pros | Cons |
|---|---|---|---|
| **R1. Fix the query only** | Move the order filter to WHERE, add the variant to the delete, keep the hard delete. | Smallest change. | Still name-based: scenario B (same variant) and C stay broken. Still hard-deletes and cascades the order link and fiscal data. **Not enough.** |
| **R2. Hard delete by link** | `DELETE FROM registration WHERE registration_id IN (SELECT oir.registration_id FROM order_item_registration oir JOIN order_item oi … WHERE oi.order_item_order_id = $order)`. Never delete participants. | Exact. Simple. No reader needs changing. | The cascade removes `order_item_registration`, so the cancelled order loses its participant names, payer and extra data. History is gone and can't be undone. Fiscal overrides are lost. |
| **R3. Soft cancel by link (status column)** | New `registration.status` (`active` / `canceled`) + `canceled_at`. Set `canceled` for the same exact set as R2. Readers filter `status = 'active'`. | Exact. Keeps history and the order detail. Reversible (late payment, mistaken cancel). Attests can skip cancelled registrations explicitly. | Every reader must filter: registration grid/base query (`camp/services/getRegistrationsBaseQuery.ts`), participant registrations, the `createRegistration` duplicate check (`:98-111`), `collectAttestCandidates.ts:35-46`, `payers.ts:56,90`, `generateFiscalAttests.ts:65`, the Woo import lookups (`runOrderImport.ts:791`, `importVariants.ts:472`). About 8 places. |
| **R4. Derive from order status** | No column. A registration counts as active when its order is not cancelled or failed. | No migration. | Every reader needs the join `oir → order_item → order`. Admin registrations have no order. Ambiguous for `pending`. Slow and easy to forget. |

### Decision 2: how the seat is released

| Option | How | Pros | Cons |
|---|---|---|---|
| **S1. Delete the reservation rows** | `DELETE FROM inventory_reservation WHERE order_id = $order`. | Availability queries stay as they are. Simple and idempotent. | No trace of the hold (the order line still has qty and variant, so it can be rebuilt). |
| **S2. `released_at` column** | Set it on release. The 3 availability queries add `AND released_at IS NULL`. | Audit trail. Easy to re-hold on a late payment. | 3 queries to change (`checkout/bootstrap.ts:82-89`, `ProductVariant.resolvers.ts:90-96`, `defaultVariant.ts:156-162`). |
| **S3. Exclude reservations of cancelled orders in the availability queries** | Join `order` and skip `payment_status IN ('canceled','failed')`. | **Retroactive**: fixes all existing stuck seats with no data change. | Logic split over 3 queries. Pending abandoned orders still hold seats. The "truth" depends on status semantics. |
| **S4. Expiring holds for unpaid orders** | `expires_at = now + TTL` at order creation. Set it to NULL once paid. Availability counts `expires_at IS NULL OR expires_at > now()`. | Frees abandoned pending orders **without a cron job**. Already foreseen as "Phase 3" (`checkout/bootstrap.ts:86-87`). | The TTL differs per method (COD and bank transfer stay pending for days). A payment after expiry can overbook, so it must re-check on `paid`. Larger change. |

### Decision 3: when to release

| Trigger | Today | Proposal |
|---|---|---|
| Admin cancels order | statuses only | release (registration + seat) |
| Payment `canceled`/`failed` (Mollie webhook and return, Stripe return and webhook) | status only | release, via one generic `hookAfter('changePaymentStatus')` in oms. This covers every provider at once. |
| PayPal cancel page | cart re-enabled, order stays `pending` | set payment `canceled` (which then releases through the hook) |
| Cart re-enabled after failure (Mollie, Stripe, PayPal) | old order left as is | the old order is abandoned, so make sure it is `canceled` before the cart is reused |
| Fully refunded (`closed`) | can't cancel | allow `cancelOrder` on `refunded` and `closed` orders, or add an admin action "Release seats & registrations". A refund alone should **not** auto-release: a goodwill refund can keep the child registered. |
| Admin deletes one registration | row only | soft-cancel it (R3) and lower that order line's `seats_held` by 1 (delete the row at 0). This needs `inventory_reservation.order_item_id`. It is also the basis for a later partial cancel. |
| Paid webhook on an already released order | 400 loop | re-activate the registrations and re-hold the seats if there is room, otherwise keep the money, add an order activity and flag it for the admin. Never throw. |

### Recommendation

For release 0.0.3:

1. **New oms service `releaseOrder(orderId, reason, connection)`**, idempotent:
   - delete the order's `inventory_reservation` rows (**S1**);
   - set `registration.status = 'canceled'`, `canceled_at = now()` for `registration_id IN (oir.registration_id of this order's order_items)` (**R3**). Rows with `registration_id` NULL (legacy) are skipped and listed in the order activity, never guessed by name;
   - keep the legacy `product_inventory.qty += qty`, but only when reservations were actually released (so it runs once) and only for `manage_stock`, respecting `reStockAfterCancellation`;
   - write an order activity ("Seats and registrations released").
2. **`cancelOrder`**: replace `reStockAfterCancel` and `removeRegistrationsAndParticipants` with `releaseOrder`. **Delete `removeRegistrationsAndParticipants` completely**, including the participant deletion.
3. **oms `hookAfter('changePaymentStatus')`**: on `canceled` or `failed`, call `releaseOrder`. PayPal cancel sets `canceled`. The Mollie/Stripe/PayPal return pages already set a status before re-enabling the cart, so the retry order then finds the seat free.
4. **Webhook `paid` on a released order**: re-activate when seats allow (see the table above) instead of throwing.
5. **Readers** filter `registration.status = 'active'`. This includes the attest plugin, which also drops the `unpaid` noise for cancelled orders. The `createRegistration` duplicate check ignores cancelled rows.
6. Later, with the email and cron work: **S4** (expiring holds) for abandoned pending orders, and allowing release on refunded orders.

Why not R2: it fixes item 2 just as precisely, but a cancel would still wipe the order's participant list and fiscal data, and a late payment couldn't be restored. R3 costs about 8 extra `WHERE` clauses.

Quick win if time is short: just ship steps 1–3 with **R2 instead of R3** (exact delete by link, no participant delete) plus S1. This is a small, safe patch that fixes both planning items. R3 can follow.

Effort: steps 1–3 + 5 **M (about 2 days)**, step 4 **S**, the quick win **S (about half a day)**.

---

## Migration and clean-up of existing data

Run as read-only checks first and review the results with the admin before changing anything.

1. **Stuck seats**: reservations of cancelled or failed orders.
   ```sql
   SELECT o.order_number, o.payment_status, o.status, ir.inventory_item_id, ir.seats_held
   FROM inventory_reservation ir JOIN "order" o ON o.order_id = ir.order_id
   WHERE o.payment_status IN ('canceled','failed') OR o.status = 'canceled';
   ```
   Fix: run `releaseOrder` for these orders, or delete the rows.
2. **Stale registrations**: registrations still linked to cancelled or failed orders (including Woo imports).
   ```sql
   SELECT r.registration_id, p.first_name, p.last_name, o.order_number, o.payment_status
   FROM registration r
   JOIN order_item_registration oir ON oir.registration_id = r.registration_id
   JOIN order_item oi ON oi.order_item_id = oir.order_item_id
   JOIN "order" o ON o.order_id = oi.order_item_order_id
   JOIN participant p ON p.participant_id = r.registration_participant_id
   WHERE o.payment_status IN ('canceled','failed');
   ```
   With R3, the migration sets these to `canceled`. Check fiscal overrides on them first (`fiscal_attest_amount_override`), because they may be deliberate.
3. **Duplicates from retries**: the same participant, product and variant more than once.
   ```sql
   SELECT registration_participant_id, registration_product_id, product_variant_id, COUNT(*)
   FROM registration GROUP BY 1,2,3 HAVING COUNT(*) > 1;
   ```
   Mostly resolved by step 2. A duplicate that remains on two paid orders is a real double booking for the admin.
4. **Registrations wrongly deleted by `cancelOrder`**: paid order lines of registration products with fewer `order_item_registration` rows than `qty`.
   ```sql
   SELECT o.order_number, oi.order_item_id, oi.product_variant_id, oi.qty,
          COUNT(oir.order_item_registration_id) AS linked
   FROM order_item oi
   JOIN "order" o ON o.order_id = oi.order_item_order_id
   JOIN product pr ON pr.product_id = oi.product_id AND pr.manage_registrations
   LEFT JOIN order_item_registration oir ON oir.order_item_id = oi.order_item_id
   WHERE o.payment_status IN ('paid','partial_refunded')
   GROUP BY 1,2,3,4 HAVING COUNT(oir.order_item_registration_id) < oi.qty;
   ```
   Recovery: the names and extra data survive in `cart_item_registration` (via `order.cart_id → cart_item`, same product and variant), unless the cart was purged. Careful: after a failed Mollie payment the same cart is reused for the retry order. Re-create the participant (or find the one that still exists), the registration and the link. Do this by hand or with a one-off script per order. Recheck fiscal attests already issued for those children (their `participant_id` may now be NULL).
5. **Inflated capacity**: simple products saved after a cancellation may have `total_seats` too high (see "Admin cancel doesn't free the seat"). After step 1, compare `total_seats` with the intended capacity per week and correct it in the admin. There's no reliable automatic fix.
6. **`product_inventory.qty`**: legacy and drifting. Optionally recompute it as `total_seats − reserved` for default variants after the clean-up.

The schema migration (R3): `ALTER TABLE registration ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active', ADD COLUMN canceled_at TIMESTAMPTZ NULL` plus an index on `(registration_product_id, product_variant_id, status)`. For S4 later, also `inventory_reservation.order_item_id`.

---

## Test scenarios

| # | Scenario | Expected after the fix |
|---|---|---|
| 1 | Mollie checkout for week 2, payment `failed` (webhook first, then return page) | Order `canceled`. Registration `canceled`. Seat free again on the product page. Cart re-enabled. Release runs once only. |
| 2 | Same as 1, but return page first, then webhook | Same result, no error, no double qty restock. |
| 3 | Mollie `expired` webhook on an abandoned order | Seat and registration released. |
| 4 | Retry after 1 with the **last** seat | Checkout succeeds. One active registration, one reservation. |
| 5 | Stripe return with a failed payment, and a Stripe `payment_intent.canceled` webhook | Released. |
| 6 | PayPal cancel page | Order `canceled`, released, cart re-enabled. |
| 7 | Admin cancels a pending COD order | Released. Participant **not** deleted. Order detail still shows the child's name. |
| 8 | Scenario A: week 1 paid in order X, week 2 pending in order Y. Cancel Y | Week 1 registration untouched and still in attests. Week 2 cancelled. Participant kept. |
| 9 | Scenario B: failed order Y and paid retry Z for the same week. Cancel Y | Z's registration untouched. |
| 10 | Scenario C: two children with the same name. Cancel one's order | Only that child's registration is cancelled. |
| 11 | Cancel any order while unrelated participants without registrations exist | Unrelated participants untouched. Query count independent of database size. |
| 12 | Order with 2 children on one line, cancel | Both registrations cancelled. `seats_held` 2 released. |
| 13 | Mollie `paid` webhook arrives for an order already released, with a seat free | Registrations re-activated, seat held again, no 400. |
| 14 | Same as 13 with no seat free | Order activity and admin flag. Webhook returns 200. |
| 15 | Admin deletes or cancels one registration from the grid | Registration cancelled. Seat count for the week goes down by 1 (after `order_item_id` on reservations). |
| 16 | Admin adds a registration manually for a child whose earlier order failed | No "Registration already exists" error. |
| 17 | Fiscal attests for a year with cancelled orders | Cancelled registrations not listed and no `unpaid` warnings for them. Paid weeks of the same child still produce an attest. |
| 18 | Cancel an order with a legacy `order_item_registration` row (`registration_id` NULL) | No name-based delete. Activity lists the unlinked row. |
| 19 | Cancel twice / cancel an already-canceled order | Clear error, no data change. |
