# Plan: variants, import & fiscal attests — steps in order

Combined step list from [`variation-plan.md`](variation-plan.md) (incl. its *Status* and *Import
follow-ups*) and [`fiscal-attests.md`](fiscal-attests.md). Details live in those docs; this file
only lists the steps in the order to do them. Already-done items are left out.

Steps marked **(decision)** need an answer before you start them.

## Stage 1: Schema groundwork (no behaviour change)

1. [x] **Decided:** the duplicate-registration rule is `(participant, product, variant)`, the same
   as the importer. Implemented in step 17.
   → variation-plan, *Import follow-up 6* / Phase 4
2. [x] **Checkout migration `Version-1.1.0.ts`** (not `1.0.10`: the migration runner only picks
   up single-digit version parts): add `cart_item.product_variant_id`, an FK plus
   index on `order_item.product_variant_id` and on `cart_item.product_variant_id`
   (`ON DELETE SET NULL`).
   → variation-plan, Phase 2
3. [x] **Catalog migration `Version-1.1.1.ts`:** `product_variant.is_default`, a unique index so a
   product has at most one default, and a backfill that gives every product without a variant
   a default one (+ `inventory_item`). Products that already have exactly one variant (imported
   simple products) get that variant flagged as the default. Products with several real
   variants get **no** default.
   → variation-plan, Phase 1
4. [x] **Camp migration `Version-1.0.4.ts`:** FK on `registration.product_variant_id`
   (`ON DELETE SET NULL`), and a backfill of NULL values to the product's default variant.
   Runs after step 3.
   → variation-plan, Phase 2
5. [x] **Catalog migration `Version-1.1.2.ts`:** `attribute_option.start_date`, `end_date`,
   `day_count` + a date-range check. Leave `value_date`/`value_int` as they are.
   → fiscal-attests, 1b

## Stage 2: Default variant + importer alignment (ship together)

6. [x] `createProduct` → `ensureDefaultVariant`; `updateProduct` → `syncDefaultVariant`
   (`catalog/services/product/defaultVariant.ts`, both `hookable`). Sync only touches a product
   whose single variant is the default one, and only the fields present in the update.
   → variation-plan, Phase 1
7. [x] **Importer:** a simple product **adopts** the default variant that `createProduct` made
   (needed anyway: both would use the product's sku, which is unique on `product_variant`) and
   keeps it `is_default`. For variable products, the unmapped default variant is removed by
   `deleteStaleVariants` once the real variations exist (unless it's in use, see step 8).
   → variation-plan, *Import follow-up 1*
8. [x] **Importer:** `deleteStaleVariants` doesn't delete variants that have registrations or
   order lines. It logs them and clears their `is_default` flag instead.
   → variation-plan, *Import follow-up 2*
9. [x] `ProductVariant` GraphQL type + `Product.variants` (`catalog/graphql/types/ProductVariant`,
   default variant first).
   → variation-plan, Phase 1
10. [ ] Verify: every product has exactly one default variant; a product created in the admin gets
    one; re-importing doesn't delete or duplicate it.

## Stage 3: Importer order linking

11. [x] **Importer:** `runOrderImport` writes `order_item_registration` for every imported
    registration, on both the new and the update path (`linkRegistrationToOrderItem`).
    - New orders: `order_item`s are now inserted **before** the participants, so each
      registration can be linked to its line.
    - Existing orders: `mapExistingOrderItems` finds the local `order_item` per WooCommerce line
      by product + variant, and fills in a missing `order_item.product_variant_id`.
    - `extra_data` holds `birth_date`, `national_number` and **`payer_national_number`**
      ("Rijksregisternummer ouder", newly parsed from the ticket), for step 24/29 to promote.
    - **Fix:** a simple product now resolves to its **default variant**. Before this, a re-import
      after the Stage 1 backfill would have created a duplicate registration (old registration
      = default variant, import = `null`). This also covers the duplicate-check bug noted at
      step 17.
    - The national-number check accepts both `national-number-field` and
      `belgian-administration`, so step 23 doesn't break the import.
    → fiscal-attests, 2c
12. [ ] **Backfill = re-run the order import once.** No separate action is needed: every run
    fetches all WooCommerce orders, and already-imported orders go through the update path,
    which now links them. This uses the real WooCommerce line items instead of guessing by
    customer and product. Afterwards, check:
    `SELECT count(*) FROM registration r WHERE NOT EXISTS (SELECT 1 FROM order_item_registration o WHERE o.registration_id = r.registration_id);`
    Lines that couldn't be matched show in the debug log ("No local order_item found …").
    → fiscal-attests, 2c
13. [x] **Decided:** imported orders don't write `inventory_reservation`. The import has no
    future camps, so only native orders count toward capacity. Revisit if that changes.
    → variation-plan, *Import follow-up 3*

## Stage 4: Checkout & registration on variants (first behaviour change)

14. [ ] Cart: optional `variantID`, a `cartItem/variant.ts` resolver (default variant when none is
    given), and sku/name/price from the variant.
    → variation-plan, Phase 3
15. [ ] Cart inventory check against `inventory_item.total_seats − reserved`.
    → variation-plan, Phase 3
16. [ ] `orderCreator.saveOrderItems`: write `registration.product_variant_id`, and insert an
    `inventory_reservation` per order item (native orders only, see step 13).
    → variation-plan, Phase 3
17. [ ] `createRegistration` + `registrationDataSchema.json` accept `product_variant_id` (default
    variant when it's missing), using the duplicate rule from step 1.
    - **Existing bug to fix here:** the duplicate check reads `participant_id` / `product_id`
      from the data, but every caller (admin API, importer) sends `registration_participant_id`
      / `registration_product_id`. So the check never matches and duplicates are never caught.
      Read the `registration_*` keys and include the variant.
    → variation-plan, Phase 4
18. [ ] `getRegistrationsByParticipantBaseQuery` joins `product_variant`; `Registration` gets
    `variantId`/`variantSku`/`variantPrice`.
    → variation-plan, Phase 4
19. [ ] Admin: variant picker in `AddRegistrations.tsx`.
    → variation-plan, Phase 5
20. [ ] Verify everything under variation-plan *Verification* (cart → order → registration →
    reservation; old orders still render).

## Stage 5: Week dates in the catalog

21. [ ] Attribute edit page: start/end/days inputs per option; the create/update attribute
    services save them; GraphQL `AttributeOption { startDate, endDate, dayCount }`.
    → fiscal-attests, 1b
22. [ ] Fill in the dates for all period options (*Week 1 zomer*, …), including the ones the
    importer created.
    → variation-plan, *Import follow-up 5*

## Stage 6: Plugin `belgian-administration`

23. [ ] Rename `national-number-field` → `belgian-administration`: folder, `package.json`,
    `config/default.json`, `npm install`. Clean up the old `migration` / `plugin_enabled.*`
    rows. Add `src/core.ts`. (The importer already accepts the new name, see step 11.)
    → fiscal-attests, *Delivery*
24. [ ] **Plugin migration `Version-1.1.0.ts`:** `customer.national_number`,
    `order_item_registration.payer_national_number`, and the `fiscal_attest_eligible` attribute
    (*Ja*/*Nee*, linked to all attribute groups).
    → fiscal-attests, 1b-bis, 1c
25. [ ] **Plugin migration `Version-1.2.0.ts`:** `fiscal_attest`, `fiscal_attest_batch`,
    `fiscal_attest_amount_override`, `fiscal_attest_payer`.
    → fiscal-attests, 1d
26. [ ] Settings page: company number, municipality as recognising body, signatory, sender
    contact, daily ceiling per year.
    → fiscal-attests, 1a
27. [ ] Set `fiscal_attest_eligible` on all camps.

## Stage 7: Collecting national numbers & payers

28. [ ] **Core:** make `AVAILABLE_PARTICIPANT_FIELDS` extensible through a processor (approved).
    → fiscal-attests, Phase 2
29. [ ] **Plugin:** register `national_number` as a checkout field;
    `hookAfter('saveOrderItems')` copies the child's number and stores the payer's number.
    → fiscal-attests, Phase 2
30. [ ] **Plugin:** payer national number field at checkout (only for dated camps).
    → fiscal-attests, Phase 2
31. [ ] **Plugin:** "Fiscal data" block in the customer account (fill in or fix numbers).
    → fiscal-attests, Phase 2
32. [ ] **Plugin:** payer split on the customer dashboard + admin
    (`fiscal_attest_payer`, `saveFiscalAttestPayers`).
    → fiscal-attests, 2b
33. [ ] **Plugin:** `hookAfter('mergeParticipants')` moves attests and the national number to the
    kept participant.
    → fiscal-attests, Phase 6

## Stage 8: Generating attests

34. [ ] `carePeriod.ts`: the variant option first, the product option second.
    → fiscal-attests, 1b
35. [ ] `collectAttestCandidates` + `buildAttests` (amount: override > order line > blocking;
    payer split; issues) with unit tests.
    → fiscal-attests, Phase 3
36. [ ] Admin: year overview + preview grid (amount override, payer split, filters, payer
    requests). `generateFiscalAttests` (preview/commit).
    → fiscal-attests, Phase 3 & 7
37. [ ] Dry run on a copy of last year's data; fix the blocking issues it reports (dates,
    eligibility, amounts, birth dates).

## Stage 9: Output & Belcotax

38. [ ] PDF per attest (`pdfkit`); downloads in the customer account and admin; bulk email.
    → fiscal-attests, Phase 4
39. [ ] Belcotax XML per income year + XSD validation; batches + status tracking.
    → fiscal-attests, Phase 5
40. [ ] Test upload in the Belcotax-on-web **test environment**.
41. [ ] Corrections & cancellations (incl. approving customer split requests).
    → fiscal-attests, Phase 6
42. [ ] (Optional) Reminder cron from 1 January.
    → fiscal-attests, Phase 8
43. [ ] Before going live, check with the accountant: care-period year for camps paid in a
    different year, and who applies the daily-rate ceiling.
    → fiscal-attests, *Open questions*
44. [ ] Generate, send to parents, upload to Belcotax (before 1 March).
