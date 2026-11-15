# Analysis: user subscription flows and manual test plan

Release 0.0.2, task: *"We need to start testing the flows from a user perspective. Recognize the different flows a user can subscribe to a sportcamp and set up a test flow so we can test everything manually."* [analysis]

This document lists every way a **registration** (`registration` row = participant + product + variant) can come into existence, the variations within each flow, and a checklist-style manual test plan. Section 5 lists gaps and risks found while reading the code. Some of them are likely bugs, and the plan includes checks for them.

---

## 1. Overview

### 1.1 Where registrations come from

| # | Entry point | Creates order? | Creates registration when | Code |
|---|---|---|---|---|
| A | Storefront checkout (product page → cart → checkout → payment) | yes | **at order placement, before payment** (`saveOrderItems`) | `core/modules/checkout/services/orderCreator.ts` |
| B | Admin: participant detail → "Add registration" | **no** | immediately | `core/components/admin/camp/participantEdit/AddRegistrations.tsx` → `core/modules/camp/services/registration/createRegistration.ts` |
| C | WooCommerce order import | yes (imported, historical amounts) | during import, per order line | `content/plugins/woocommerce-import/src/lib/runOrderImport.ts` |

The admin "New Registration" button on the registrations grid only opens the *new participant* form (`participantNew`). It does not create a registration by itself, so it is part of flow B.

### 1.2 Storefront flow (A) in detail

```mermaid
flowchart TD
    P[Product page /product/:uuid] --> V{More than 1 bookable variant?}
    V -- yes --> VP[Pick week - VariantPicker<br/>sold-out/past weeks disabled/hidden]
    V -- no --> AB
    VP --> AB[ADD PARTICIPANT button<br/>manageRegistrations = 1]
    AB --> M[Participant modal]
    M --> G{Logged in?}
    G -- no --> GL[Optional links: Login / Register<br/>redirect back to product]
    G -- yes --> SP[Optional: select saved participant]
    GL --> F[First name, last name + custom checkout fields<br/>from Settings > Camp: birth_date, national_number, payer_national_number]
    SP --> F
    F --> AC[POST addMineCartItem<br/>capacity check: total_seats - reserved]
    AC --> C[Cart /cart<br/>edit/remove registration, coupon]
    C --> CO[Checkout /checkout]
    CO --> S1[Step 1 Contact: email - guest or logged in]
    S1 --> S2{All items manageRegistrations?}
    S2 -- yes --> S3[Shipment step skipped]
    S2 -- no --> SH[Shipping address + method]
    S3 --> S4[Payment step: billing address<br/>+ payer national number - belgian plugin<br/>+ choose method]
    SH --> S4
    S4 --> PO[placeOrder: order + order_items + participants<br/>+ registrations + order_item_registration<br/>+ inventory_reservation; cart disabled]
    PO --> PM{Payment method}
    PM -- COD --> COD[order_placed emitted<br/>payment pending until admin Capture]
    PM -- Stripe --> ST[PaymentIntent → confirm → /stripe/return<br/>+ webhook succeeded/capturable/canceled]
    PM -- Mollie --> MO[Create payment → Mollie hosted page → /mollie/return<br/>+ webhook paid/failed/expired/canceled/refund]
    PM -- PayPal --> PP[PayPal order → approve → /paypal/return capture/authorize<br/>or /paypal/cancel]
    COD --> OK[/checkout/success/:orderId]
    ST --> OK
    MO --> OK
    PP --> OK
    ST -- fail --> FAIL[cart re-activated, payment_status failed/canceled,<br/>redirect /cart; order + registrations remain]
    MO -- fail --> FAIL
    PP -- cancel --> FAIL
```

### 1.3 Post-purchase

```
Order (admin /admin/orders/edit/:uuid)
 ├── Capture (COD, Stripe authorizeOnly, Mollie, PayPal authorize)
 ├── Refund  (Stripe, Mollie; Mollie refund status comes back via webhook)
 ├── Cancel  (only if payment_status is cancelable: pending/canceled - NOT paid)
 │     └── cancelOrder: status canceled, product qty restock, delete registrations (+ participant if orphaned)
 └── Fiscal attest exclusion (belgian-administration)
Customer account (/account)
 ├── Order history
 ├── Fiscal data (customer national number)          [belgian-administration]
 ├── Fiscal attests download / payers                [belgian-administration]
 └── (no storefront view of participants/registrations)
```

---

## 2. Flows and preconditions

| ID | Flow | Preconditions |
|---|---|---|
| **A1** | Guest, 1 participant, single-variant camp, COD | COD enabled; camp product with `manageRegistrations=1`, status enabled, `manage_stock` on, seats > 0 |
| **A2** | Guest → Register/Login during flow → continue | Customer registration enabled |
| **A3** | Logged-in customer, new participant | Existing customer account without participants |
| **A4** | Logged-in customer, saved participant | Customer with ≥1 linked participant |
| **A5** | Multi-week camp: pick week, 2 weeks same child, 2 children same week | Product with ≥3 variants (one sold out, one past, one disabled) |
| **A6** | Custom checkout fields (birth date, child/payer national number; required / `useForUniqueness`) | Settings → Camp configured; belgian-administration enabled |
| **A7** | Cart manipulation: edit/remove registration, mixed cart | Non-registration product + shipping zone/method |
| **A8** | Coupons (percentage / fixed / specific product / 100% / expired / max uses / customer group) | Coupons created in admin |
| **A9** | Capacity: last seat, sold out, two buyers for the last seat | Variant with 1 seat |
| **P-COD** | Cash on delivery: place → admin capture | COD enabled |
| **P-STR** | Stripe: success (capture / authorizeOnly), 3DS, declined, retry, refund full/partial | Stripe test keys + webhook secret, `stripe listen` |
| **P-MOL** | Mollie: paid, failed, canceled, expired, open, refund | Mollie test key, public URL for webhook |
| **P-PP** | PayPal: approve CAPTURE / AUTHORIZE, cancel | PayPal sandbox app + buyer |
| **B1** | Admin adds registration to existing participant | Admin; participant exists |
| **B2** | Admin "New Registration" → new participant → add registration | Admin |
| **C1** | WooCommerce import: products → line mapping → orders; re-run; rollback | WC test shop + REST keys |
| **D1** | Admin order lifecycle: cancel, refund, cancel after failed payment | Orders from flows above |
| **D2** | Customer account after purchase | Customer with orders |
| **D3** | Fiscal attests (281.86) | belgian-administration settings; `fiscal_attest_eligible` products |

---

## 3. Manual test plan

Conventions:
- **SF** = storefront, **ADM** = admin, **DB** = optional SQL check, **PSP** = payment provider dashboard.
- "Verify registration" means: ADM → Camps → Registrations grid shows the row with the right participant, product and **variant**. ADM → participant detail → Registrations lists it.
- "Verify participant" means: the participant exists once (no duplicate), and `customer` is linked for logged-in purchases.
- **Emails:** the codebase has **no email sending** (no subscriber on `order_placed` / `customer_registered`; reset password says "handled by extensions"). For now, record **"no email received"** as the expected and accepted result. It is listed as gap G1.
- DB helper (run after each order):
  ```sql
  SELECT o.order_number, o.status, o.payment_status, o.payment_method, o.grand_total, o.customer_id, o.coupon
  FROM "order" o ORDER BY order_id DESC LIMIT 1;
  SELECT oir.first_name, oir.last_name, oir.extra_data, oir.payer_national_number, r.registration_id, r.product_variant_id
  FROM order_item_registration oir JOIN order_item oi USING (order_item_id)
  LEFT JOIN registration r ON r.registration_id = oir.registration_id
  WHERE oi.order_item_order_id = (SELECT max(order_id) FROM "order");
  SELECT * FROM inventory_reservation ORDER BY inventory_reservation_id DESC LIMIT 5;
  ```

### A1 - Guest, single-variant camp, COD (baseline)
Test data: `TEST-CAMP-SINGLE` (1 default variant, 10 seats, €100), guest `guest1@test.local`, child "Lotte Test".
- [ ] 1. SF product page: button **ADD PARTICIPANT**, no week picker, qty field hidden.
- [ ] 2. Click: the modal shows "Want to check out faster? Login or Register".
- [ ] 3. Submit with empty names: validation errors, cart unchanged.
- [ ] 4. Fill names → Add To Cart: toast "JUST ADDED TO YOUR CART", mini-cart 1, modal closes.
- [ ] 5. /cart: participant shown under the line, qty disabled = 1, no "remove item" link (only per-registration remove).
- [ ] 6. Checkout: enter email; **no shipment step**.
- [ ] 7. Payment step: billing address, Cash on delivery, place order.
- [ ] 8. SF: /checkout/success/:uuid shows order number, participant, €100.
- [ ] 9. ADM order: status New, payment Pending, shipment Pending, activity "Order created", no shipping address, billing present, no customer.
- [ ] 10. Registration has the default variant (not null).
- [ ] 11. Participant "Lotte Test" created, no customer linked.
- [ ] 12. Seats −1 (1 `inventory_reservation` row, seats_held=1).
- [ ] 13. ADM Capture (COD): payment Paid, order Processing, offline transaction, activity "Customer paid using cash."
- [ ] 14. Emails: none (G1).
- [ ] 15. The product page in another session reflects the seat count ("x places left" when ≤5).

### A2 - Guest registers / logs in during flow
- [ ] 1. Modal → Register: register page with `?redirect=` to the product.
- [ ] 2. Register `new1@test.local`: logged in and redirected back to the product.
- [ ] 3. Add "Noah Test", check out (COD or Stripe).
- [ ] 4. ADM customer exists; the order is in customer Order History.
- [ ] 5. Participant is linked to the customer.
- [ ] 6. Same with Login for an existing customer: guest cart kept/merged (`addCustomerToCart`), count unchanged.
- [ ] 7. Guest adds a participant, logs in at the checkout contact step: cart intact, order has `customer_id`.
- [ ] 8. Emails: no welcome mail (G1).

### A3 / A4 - Logged-in customer, new vs saved participant
Test data: `parent1@test.local` with linked participants Emma and Lucas Parent1.
- [ ] 1. Dropdown "Select a Saved Participant" lists only Emma and Lucas.
- [ ] 2. Selecting Emma prefills the names.
- [ ] 3. After checkout: no new participant; the registration is on the existing Emma.
- [ ] 4. A3: new child "Mila Parent1" is created and linked; she appears in the dropdown next time.
- [ ] 5. **Name collision (G4):** `parent2@test.local` registers "Emma Parent1". Record which participant is used. The current code reuses parent1's participant and does not link parent2.
- [ ] 6. With `birth_date` as useForUniqueness and different birth dates: two participants.

### A5 - Multi-week camp
Test data: `TEST-CAMP-WEEKS`: W0 past, W1 10 seats, W2 1 seat, W3 0 seats, W4 disabled; €120.
- [ ] 1. Picker lists W1, W2, W3; W0 and W4 hidden; sorted by label; dates dd/mm/yyyy.
- [ ] 2. W3 "Sold out" with radio disabled; W2 "1 places left".
- [ ] 3. ADD PARTICIPANT without a choice gives "Please choose a week".
- [ ] 4. Child A + child B to W1: one line, qty 2, 2 registrations.
- [ ] 5. Child A to W2: separate line.
- [ ] 6. Child A to W1 again: record the result (no duplicate check at checkout, G6).
- [ ] 7. Order: correct `product_variant_id` per registration, seat holds per variant.
- [ ] 8. All variants sold out: **SOLD OUT** button.

### A6 - Custom checkout fields + belgian-administration
Setup: Settings → Camp: `birth_date` (required, uniqueness), `national_number` (Rijksregisternummer kind), `payer_national_number` (Rijksregisternummer ouder). Valid test number e.g. `85073003328`, invalid `85073003329`.
- [ ] 1. The modal shows the fields with labels from settings; date placeholder `YYYY-MM-DD`.
- [ ] 2. Empty required birth date: client error, and server "Date of Birth is required".
- [ ] 3. Invalid child national number: rejected, item not added.
- [ ] 4. /cart edit registration: extra fields prefilled/editable, invalid values rejected.
- [ ] 5. Payment step: PayerNationalNumber block with a "not applicable" checkbox.
- [ ] 6. Invalid payer number: "Your national number is not a valid Belgian national number".
- [ ] 7. After the order:
  - [ ] `order_item_registration.extra_data` filled.
  - [ ] `participant.birth_date` / `national_number` filled only if empty (never overwritten).
  - [ ] `order_item_registration.payer_national_number` filled.
  - [ ] Logged-in: `customer.national_number` updated (ADM customer edit).
- [ ] 8. With both the `payer_national_number` field and the payment block active, the payer number is asked twice. Record this (relates to the planning fix "2 fields on customer details", G17).
- [ ] 9. Fields disabled: the flow still works.

### A7 - Cart manipulation / mixed cart
- [ ] 1. A line with 2 registrations: remove one. Expect qty 1 and half the total. **Verify (G5)**: qty is not decremented in `removeCartItemRegistration`.
- [ ] 2. Remove the last registration of a line: record whether the line stays (qty ≥1, 0 participants, no remove link).
- [ ] 3. Edit a registration name: the order uses the new name.
- [ ] 4. Mixed cart (camp + `TEST-TSHIRT`): shipment step shown, method required, order has a shipping address.
- [ ] 5. Normal product: qty editable.

### A8 - Coupons
Coupons: `TEST10` (10% order), `TEST20EUR` (€20), `CAMPONLY` (SKU condition), `FREE100` (100%), `EXPIRED`, `ONCE` (max 1), `GROUPX` (customer group).
- [ ] 1. `TEST10`: discount correct in cart, checkout summary, success page, ADM order.
- [ ] 2. Invalid/expired/disabled coupon: error, no discount.
- [ ] 3. `ONCE`: second use rejected. Also after a *failed* payment: `used_time` is incremented by a DB trigger at order insert (G10).
- [ ] 4. `CAMPONLY` only discounts the camp line.
- [ ] 5. `FREE100` (total €0) per payment method: record the result (G11); COD should work.
- [ ] 6. `GROUPX`: guest rejected, group member accepted.
- [ ] 7. Fiscal attest uses the discounted line total (check in D3).

### A9 - Capacity
- [ ] 1. Buy the last seat of W2: W2 becomes Sold out.
- [ ] 2. Two browsers, each with W2 (1 seat) in the cart; B places the order, then A places: A is rejected "This item is out of stock" (no cart-time hold).
- [ ] 3. 2 participants on a 1-seat variant: "We do not have enough stock".
- [ ] 4. After a failed/canceled payment: is the seat freed? Expected with the current code: **no** (G2).
- [ ] 5. After an admin cancel: is the seat freed? Expected with the current code: **no** (cancel restocks `product_inventory.qty`, not `inventory_reservation`; G2).
- [ ] 6. Admin adds a registration to a sold-out week: allowed, seat count unchanged (G3).
- [ ] 7. `manage_stock` off: no seat check, no "places left".

### P-COD
- [ ] Covered by A1 7-13.
- [ ] COD disabled in settings: method hidden.
- [ ] Cancel a pending COD order (D1).

### P-STR - Stripe test mode
Setup: `pk_test`/`sk_test` + `whsec` from `stripe listen --forward-to localhost:3000/stripe/webhook`. Mode capture, then authorizeOnly.
Cards: `4242 4242 4242 4242` success; `4000 0025 0000 3155` 3DS; `4000 0000 0000 9995` insufficient funds; `4000 0000 0000 0002` generic decline.
- [ ] 1. Success (capture): /stripe/return → /checkout/success. ADM Paid/Processing, transaction = PI id, activity "Customer paid by using Stripe". `stripe listen` shows `payment_intent.succeeded` 200. PSP: PI succeeded, amount = grand total, metadata order_id/cart_id.
- [ ] 2. 3DS approve gives the same result. 3DS fail: /cart "Payment failed", payment Failed, status New.
- [ ] 3. Decline: inline error. The order **already exists** (placeOrder runs before the PI); Pending with registrations + seat hold (G2).
- [ ] 4. Retry after failure: a second order with a second set of registrations. Check for duplicates (G2/G6).
- [ ] 5. authorizeOnly: Authorized (`amount_capturable_updated`) → ADM Capture → Paid; PSP captured.
- [ ] 6. Full refund: Refunded, order Closed; PSP refund. The registration **still exists** (G7).
- [ ] 7. Partial refund: Partial refunded, order Processing.
- [ ] 8. Webhook stopped: success page shown but ADM stays Pending. Start listen + `stripe events resend <id>`: status updates.
- [ ] 9. Admin cancels a pending Stripe order: PI canceled in PSP.

### P-MOL - Mollie test mode
Setup: test key `test_…`, mode test. The webhook URL comes from `buildAbsoluteUrl('mollieWebhook')`, so you need a public tunnel (ngrok/cloudflared) as the shop home URL. On Mollie's test page choose paid / failed / canceled / expired / open.
- [ ] 1. Paid: /mollie/return → success. ADM Paid with activities "Customer authorized by using Mollie. Transaction ID: tr_…" and "Customer paid by using Mollie." PSP: paid, description "Payment for order #…", webhook 200.
- [ ] 2. Failed/canceled/expired: /cart "Payment failed or was canceled"; payment Canceled but order **Processing** (G9); cart re-activated; registrations + seat hold remain (G2).
- [ ] 3. Open/pending: the success page is shown although payment is not confirmed. Check the wording.
- [ ] 4. Paid: the status changes only after the webhook.
- [ ] 5. Admin cancels the order while Mollie is open, then pay: webhook returns 400 "Order is already canceled" and Mollie keeps retrying (G8). Record this.
- [ ] 6. Refund full/partial via the ADM button: after the webhook, Refunded/Partial refunded + activity with refund ids; PSP shows the refund.
- [ ] 7. €0 total (`FREE100`).

### P-PP - PayPal sandbox
- [ ] 1. Approve (CAPTURE): /paypal/return/:order → capture → success; ADM Paid; PSP sandbox transaction.
- [ ] 2. Cancel at PayPal: /paypal/cancel → /checkout; cart re-activated; order stays Pending with registrations + seat hold (G2).
- [ ] 3. AUTHORIZE: Authorized → ADM Capture → Paid.
- [ ] 4. Approve, then close the browser before the return: stays Pending (no webhook, G12).
- [ ] 5. The PayPal module ships `pages/admin/orderEdit/StripeRefundButton.jsx`: check which refund button shows on PayPal orders.

### B1 / B2 - Admin-created registrations
- [ ] 1. Participant "Lotte Test" → Add registration → single-variant product: default variant.
- [ ] 2. Multi-week product: variant chooser (check the transparent background, planning fix); pick W1.
- [ ] 3. Same product+variant again: "Registration already exists".
- [ ] 4. Same product with another variant: allowed.
- [ ] 5. **No order created**, no payment, no seat hold, storefront seats unchanged (G3). Input for the planning analysis "does it create an order / finances".
- [ ] 6. B2: Registrations grid → New Registration → participant form with national number (valid / invalid / not applicable) → add a registration.
- [ ] 7. Link the participant to a customer: the customer sees it in the storefront dropdown (A4).
- [ ] 8. Delete a registration from the participant page.
- [ ] 9. D3: an admin registration on an eligible product appears in fiscal attests with the fallback payer.

### C1 - WooCommerce import
Setup: WC test/staging shop with REST key/secret; orders with participant meta, a guest order, an existing-email order, refunded/cancelled orders, and a line for a non-imported product.
- [ ] 1. Products import: batch counts, variants, `woocommerce_product_map`.
- [ ] 2. Line mapping: map lines to variants (check the search → product picker, planning item); create a variant from a line.
- [ ] 3. Orders import: batch completed/partial with failure reasons.
  - [ ] WC amounts kept, statuses mapped.
  - [ ] Customer matched by email, otherwise created; guest order has no customer.
  - [ ] Participants matched by national number, then name + birth date (birth date backfilled), else created.
  - [ ] Registrations with the right variant + `order_item_registration` link + payer national number.
  - [ ] Customer national number imported.
- [ ] 4. Re-run: no duplicates; counted as "updated"; statuses refreshed.
- [ ] 5. Rollback a batch: orders/products removed; check registrations and participants too.
- [ ] 6. Seats: imported orders probably do not hold seats (G3). Compare storefront availability with real occupancy.
- [ ] 7. An imported customer logs in (password reset needed, no email, G1); order history shows imported orders.

### D1 - Admin order lifecycle
- [ ] 1. Cancel a pending COD order: Canceled, activity "Order canceled (reason)", registrations deleted, orphan participant deleted.
  - [ ] **G13/G4 check:** same child in order X (W1) and order Y (W2) of the same product. Cancel X: W2 of Y must survive. A same-name participant of another customer must not be touched.
  - [ ] A participant linked to a customer stays in that customer's dropdown.
  - [ ] Seat holds are not released (G2).
- [ ] 2. Paid order: Cancel hidden/refused. After a refund, can it be canceled? (`refunded` has no `isCancelable`.)
- [ ] 3. Cancel after a failed Stripe/Mollie payment: allowed; same checks as step 1.
- [ ] 4. Order grid: search by number/email, filter by status.

### D2 - Customer account
- [ ] 1. /account order history: all orders, status, total.
- [ ] 2. Order detail shows participants per line (no dedicated participant/registration page, G14).
- [ ] 3. Account edit: name/email/password.
- [ ] 4. Forgot password: token created, **no email** (G1).
- [ ] 5. belgian-administration: Fiscal data (customer national number, validated), Fiscal attests download, Payers block.

### D3 - Fiscal attests
- [ ] 1. Settings → Fiscal attests: organiser, KBO (mod-97), signatory, max per day.
- [ ] 2. `TEST-CAMP-WEEKS` fiscal eligible; child under 14.
- [ ] 3. Preview the current year: candidates from A (paid), B (fallback payer), C (imported); canceled/failed orders excluded (verify which payment statuses count).
- [ ] 4. Exclude an order (orderEdit block): it disappears from the candidates.
- [ ] 5. Generate → PDF → Belcotax XML; the customer downloads it in /account.
- [ ] 6. Corrections: change amount/payer → preview → commit.

---

## 4. Fixtures, seed data and environment

### 4.1 Environment
- [ ] `pg_dump` snapshot before the test run; restore between runs.
- [ ] `npm run compile && npm run build && npm run dev` (plugins need a rebuild).
- [ ] Public tunnel (`ngrok http 3000` / cloudflared) as the shop home URL (Mollie webhook, PayPal return URLs).
- [ ] Stripe test: `pk_test`, `sk_test` in Settings → Payment (or `config/local.json` `system.stripe.secretKey/endpointSecret`); `stripe login`; `stripe listen --forward-to localhost:3000/stripe/webhook`.
- [ ] Mollie test: `test_…` key, payment mode 0 (test). Note that `getMollieApiKey` logs the key in debug mode.
- [ ] PayPal sandbox: developer.paypal.com app + sandbox personal account.
- [ ] COD enabled.
- [ ] Mail catcher (Mailpit) only after G1 is solved.
- [ ] Two browser profiles (guest vs customer, race test A9-2).

### 4.2 Seed data (create once, then snapshot)

| Type | Key | Details |
|---|---|---|
| Camp | `TEST-CAMP-SINGLE` | manageRegistrations=1, manage_stock, 1 default variant, 10 seats, €100, fiscal eligible |
| Camp | `TEST-CAMP-WEEKS` | W0 past, W1 10 seats, W2 1 seat, W3 0 seats, W4 disabled; €120; dated attribute options |
| Camp | `TEST-CAMP-NOSTOCK` | manage_stock off |
| Product | `TEST-TSHIRT` | manageRegistrations=0, shippable; shipping zone BE + flat rate |
| Customers | `parent1@`, `parent2@`, `groupx@test.local` | `Test1234!`; parent1 has Emma & Lucas Parent1 linked; groupx in group X |
| Participant | Lotte Test | no customer |
| Coupons | TEST10, TEST20EUR, CAMPONLY, FREE100, EXPIRED, ONCE, GROUPX | see A8 |
| Camp settings | checkout fields | birth_date (required, uniqueness), national_number, payer_national_number |
| Fiscal settings | organiser + KBO | valid test KBO |
| National numbers | valid / invalid | `85073003328` / `85073003329`, plus one born after 2000 |

Suggestion ([execute] later): a seed script (e.g. `includes/bin/seed-test-data`) for a one-command reset.

### 4.3 Run log template

| Flow | Tester | Date | Payment ref | Order # | OK/NOK | Issue |
|---|---|---|---|---|---|---|

---

## 5. Gaps, risks, automation

### 5.1 Gaps and risks (from code reading; confirm during testing)

| ID | Sev. | Finding | Where |
|---|---|---|---|
| G1 | High | No emails at all (no `order_placed`/`customer_registered` subscribers; password reset not mailed). | `core/modules/*/subscribers` (only catalog), `customer/api/resetPassword` |
| G2 | High | Registrations + seat holds are created at placeOrder, before payment. Failed/canceled/abandoned payments keep them; a retry creates a second order and duplicate registrations; `cancelOrder` never deletes `inventory_reservation`. Seats leak. | `checkout/services/orderCreator.ts`, `oms/services/cancelOrder.ts`, stripe/mollie return pages, paypal cancel page |
| G3 | Medium | Admin registrations and WC-imported orders hold no seats and skip the capacity check; admin registrations create no order (no financial trace). | `camp/services/registration/createRegistration.ts`, `woocommerce-import/src/lib/runOrderImport.ts` |
| G4 | High | Participant matched by name only (+ uniqueness fields) across all customers at checkout and at cancel; the second family is not linked. | `orderCreator.ts` saveOrderItems, `cancelOrder.ts` |
| G5 | Medium | Removing a registration in the cart does not reduce qty; the last registration removed may leave an orphan line. | `checkout/services/removeCartItemRegistration.ts`, `components/frontStore/checkout/cart/items/Items.tsx` |
| G6 | Medium | No duplicate check at checkout (the admin path has one). | `orderCreator.ts` vs `createRegistration.ts` |
| G7 | Medium | Refund keeps registrations; a paid order cannot be canceled. A business rule is needed. | `oms/bootstrap.ts`, refund APIs |
| G8 | Medium | Webhook after admin cancel: `changePaymentStatus` throws, the webhook returns 400, and the PSP retries forever. | `oms/bootstrap.ts` hookAfter changePaymentStatus |
| G9 | Low | Mollie failure → payment canceled → order Processing; Stripe failure → failed → New. Inconsistent. | `oms/bootstrap.ts` psoMapping, `stripe/bootstrap.ts` |
| G10 | Low | Coupon `used_time` incremented at order insert (failed orders consume coupons). | `promotion/migration/Version-1.0.0.js` |
| G11 | Medium | €0 orders with online PSPs likely rejected; no free-order path. | stripe createPaymentIntent, mollie create payment |
| G12 | Medium | PayPal has no webhook; capture only on browser return. | `paypal/pages/frontStore/paypalReturn` |
| G13 | High | `removeRegistrationsAndParticipants`: LEFT JOIN with the order filter in ON (iterates all rows), deletes by participant+product ignoring variant/order. Can delete another week's registration of another order and delete participants still used by customers. | `oms/services/cancelOrder.ts` |
| G14 | Low | No storefront page for a customer's participants/registrations. | `customer/pages/frontStore/account` |
| G15 | Low | No locking on the last seat (check at add-to-cart + placeOrder only). | `checkout/services/cart/fields/cartItem/inventory.ts` |
| G16 | Low | Mollie frontend `if (!result.ok \|\| !data.error)` hides API errors; API key in debug log. | `mollie/pages/frontStore/checkout/Mollie.tsx`, `mollie/services/getMollieApiKey.ts` |
| G17 | Low | Payer national number can be asked twice (checkout field + payment-step block); related to the planning bug. | `belgian-administration/src/bootstrap.ts`, `pages/frontStore/checkout/PayerNationalNumber.tsx` |
| G18 | Info | No E2E tests (Jest unit only). | `package.json` |

Suggested follow-ups: G2+G13 (registration lifecycle tied to payment state, correct cancel cleanup), G4 (participant identity per customer), G1 (transactional email module), G3 (admin registration → order or seat hold).

### 5.2 Automate later (Playwright), in priority order
1. A1 guest + COD smoke test (no PSP; run on every PR). Assert through admin GraphQL/DB.
2. A5 variants + A9 capacity (seeded 1-seat variant).
3. A6 custom fields + national number validation.
4. A4 saved participant (no duplicate, customer link).
5. A7 cart edit/remove registration (guards G5).
6. D1 cancel with the multi-week scenario (guards G13) + seat release once G2 is fixed.
7. Stripe success + decline (Elements test cards; webhooks via `stripe listen`/`stripe trigger` or a signed payload). Keep Mollie/PayPal hosted pages manual, or mock the PSP client at API level.
8. B1 admin add registration (variant chooser, duplicate error).
9. WooCommerce import as a Jest integration test with recorded WC API fixtures, not UI.

Setup: `tests/e2e` with Playwright, seed script (4.2) in `globalSetup` against a disposable Postgres (docker), fixtures `asGuest`, `asCustomer('parent1')`, `asAdmin`.
