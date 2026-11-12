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

13b. [x] **Kampweek per season** (`woocommerce-import/src/lib/season.ts`). Decided: a variant per
    season, cut-off **1 October**, only the `kampweek` attribute (also `pa_kampweek`).
    - **Season of an order:** placed from 1 October → next year (2026-10-01 → 2027);
      otherwise the same year.
    - **Order import:** each order line is booked on the variant of the order's season,
      e.g. kampweek option "Week 1 zomer 2027". `ensureSeasonVariant` creates it when
      needed: same other options, sku `<sku>-2027`, same price/seats.
    - **Product import:** the WooCommerce variation maps to the *current* season's variant.
      - A mapped variant that still holds registrations/orders of another season is kept as
        that season's variant: its sku becomes `<sku>-2026`, or `<sku>-old-<id>` for a variant
        from before seasons existed.
    - **Existing data:** registrations and order lines on a variant without a year
      ("Week 1 zomer") are moved to the right season variant on the next order import. A
      participant who did the same week in two years then gets two registrations; before,
      both years collapsed into one.
    - **Run order:** product import first, then order import. Variants from before seasons
      that end up unused are removed by the next product import. Their year-less kampweek
      options stay in the attribute and can be deleted by hand.
    - Week dates (step 22) are now filled in **per season option** ("Week 1 zomer 2027").

13c. [x] **One product per camp type** (`woocommerce-import`: `lib/campProducts.ts`,
    `season.parseCampProductName`, migration `Version-1.0.4.ts`). WooCommerce has a product per
    year. Decided:
    - **Year location:** the year goes into the kampweek option.
    - **Season source:** the year in the product name decides the season; the order date is
      only a fallback.
    - **Existing products:** already-imported per-year products are merged.

    How it works:
    - **Product import:** "Golfsurfen-watersporten-omnisport 2022" and "… 2023" both go to
      the product "Golfsurfen-watersporten-omnisport".
      - The camp-type product has url_key/sku = slug of the name.
      - `woocommerce_camp_product` remembers the product per camp type and its newest year.
      - Description, price, images and categories come from the **newest** year.
    - **Variants:** each year's variations become variants with kampweek "Week 1 zomer 2022",
      using the year from the name, so no order-date guessing.
      - A *simple* year product gets one variant with kampweek option "<camp name> <year>".
      - Year variants are never the default variant.
    - **Merge:** an already-imported per-year product is merged on the next product import.
      - Its variants, registrations, order lines and map rows move to the camp product, and
        the empty year product is deleted.
      - Its year-less variants are relabelled in place ("Week 1 zomer" → "Week 1 zomer 2022").
        They only ever held that year.
      - The first per-year product of a camp type is reused (renamed) as the camp product.
    - **Order import:** a line's season = `woocommerce_product_map.external_year` (or the
      year in the line's product name). The 1 October order-date rule only applies to
      products without a year in their name. Legacy lines without a product id are found
      by camp type.
    - **Cleanup:** `deleteStaleVariants` only touches the variations of the WC product being
      synced (`woocommerce_variation_map.external_product_id`), so one year doesn't delete
      another year's variants.
    - **Caveat:** rolling back a *product* batch deletes products created in that batch.
      Since a camp product now holds several years, don't roll back a product batch after
      later batches have merged into it.

## Stage 4: Checkout & registration on variants (first behaviour change)

14. [x] Cart: a new `product_variant_id` cart item field (`cartItem/variant.ts`). It uses the
    given variant (checked against the product) or the product's default variant, loaded by
    `cartItemVariantLoaderFunction` (checkout `bootstrap.ts`).
    - `product_sku` and `product_price` come from the variant, so two weeks of the same camp
      are two cart lines.
    - `product_name` stays the product's name; the variant title is already shown separately.
    - Both add-to-cart APIs accept an optional `product_variant_id`.
    - A product with only real variants and none chosen has no variant and falls back to
      product sku/price/stock, as before, until the storefront picker exists.
    → variation-plan, Phase 3
15. [x] Cart inventory check against `inventory_item.total_seats − reserved`
    (`manage_stock` stays the on/off switch).
    - **Capacity fix:** `syncDefaultVariant` now sets `total_seats` = product qty + reserved seats.
      Product qty is what's still free (the legacy trigger lowers it), so this stops sold
      seats being counted twice.
    → variation-plan, Phase 3
16. [x] `orderCreator`: `registration.product_variant_id` is written, and a new hookable
    `saveInventoryReservations` step adds one `inventory_reservation` per order line with a
    variant (native orders only, see step 13). `order_item.product_variant_id` comes from the
    cart item's `export()`.
    → variation-plan, Phase 3
17. [x] `createRegistration` + `registrationDataSchema.json` accept `product_variant_id` (checked
    against the product; default variant when it's missing).
    - Duplicate rule is `(participant, product, variant)`.
    - **Fixed:** the duplicate check now reads the `registration_*` keys. Before, it read
      `participant_id` / `product_id`, which no caller sends, so it never matched.
    → variation-plan, Phase 4
18. [x] `getRegistrationsByParticipantBaseQuery` already joined `product_variant` through the base
    query. `Registration` now also has `productVariantId`, `variantSku` and `variantPrice`.
    → variation-plan, Phase 4
19. [x] Admin: `AddRegistrations.tsx` asks for the product's `variants`.
    - One variant → registered directly. Several → a picker (title, sku, price).
    - Products are no longer shown as "already added", since several weeks of the same camp
      are allowed. Duplicates are rejected by the server and shown as a toast.
    → variation-plan, Phase 5
19b. [x] Admin **Variants card** on the product edit page (`catalog/pages/admin/productEdit/Variants.tsx`).
    - **Shows:** each variant's title/options, sku, price, seats, number of registrations +
      order lines, and a default badge.
    - **Manage:** add, edit (sku, title, price, seats, one option per select attribute,
      default) and delete. Delete is only allowed when nothing uses the variant and it isn't
      the last one.
    - **Backend:** API `POST /api/products/:id/variants`, `PATCH|DELETE /api/productVariants/:id`
      (service `catalog/services/product/productVariants.ts`). It checks:
      - the sku is unique;
      - each option belongs to its attribute;
      - no two variants of a product have the same options (`variant_lookup`);
      - only one variant is the default.
    - **GraphQL (admin):** `ProductVariant { options, usageCount, updateApi, deleteApi }`,
      `Product { createVariantApi, variantAttributes }`. `variantAttributes` lists the select
      attributes of the product's attribute group, plus any attribute its variants already use.
19c. [x] **Storefront variant picker** (was out of scope in variation-plan; now done).
    - **GraphQL:** `Product.bookableVariants` lists label, price, dates of the dated option,
      seats left and sold out, sorted alphabetically. It leaves out variants whose period has
      ended, and undated variants of an earlier year ("… 2025").
    - **Product page** (`productView/Form.tsx`): with more than one bookable variant, a
      "Choose a week" list. The choice is posted as `product_variant_id` to the add-to-cart
      API. "Sold out" / "x places left" is shown when 5 or fewer are left.
    - **Cart, checkout summary, order confirmation:** the variant title is shown under the
      product name (`CartItem.variantTitle`), so two weeks of the same camp can be told apart.
20. [ ] Verify everything under variation-plan *Verification* (cart → order → registration →
    reservation; old orders still render).
    - The checkout unit tests (`core/modules/checkout/tests/unit`) can't run: they import
      `../../../lib/...` from the old `packages/evercamps/src` layout, and `jest.config.js`
      still points at `src/` and `packages/`. Fixing the test setup is a separate task.

## Stage 5: Week dates in the catalog

21. [x] Attribute edit page: start/end/days inputs per option; the create/update attribute
    services save them; GraphQL `AttributeOption { startDate, endDate, dayCount }`.
    - Validation lives in `catalog/services/attribute/optionPeriod.ts`:
      - both dates or neither, `YYYY-MM-DD`, end not before start;
      - days is a whole number ≥ 1 that fits between the dates;
      - empty days = weekdays between the dates.
    - All options are checked before anything is saved.
    - GraphQL returns the dates as `YYYY-MM-DD` strings (node-postgres gives `Date` objects).
    - **Also fixed:** a new option's random temporary id could match an existing option of
      *another* attribute and overwrite it. The update now only matches options of the same
      attribute. The "New Attribute" page no longer crashes on `attribute = null`.
    → fiscal-attests, 1b
22. [ ] Fill in the dates for all period options (*Week 1 zomer*, …), including the ones the
    importer created.
    → variation-plan, *Import follow-up 5*

## Stage 6: Plugin `belgian-administration`

23. [x] Renamed `national-number-field` → `belgian-administration`.
    - **Files:** `git mv`, `package.json` (`evercamps-belgian-administration`, 1.1.0),
      `config/default.json`, `npm install` (workspace link), new `src/core.ts`, READMEs.
    - **tsconfig:** now the same as woocommerce-import, plus the `@evercamps/evercamps/*`
      paths, so `npx tsc --noEmit` passes.
    - **Old rows:** `Version-1.1.0` removes the old `migration` row and carries over a
      `plugin_enabled.national-number-field` override.
    → fiscal-attests, *Delivery*
24. [x] **Plugin migration `Version-1.1.0.ts`:** `customer.national_number` and
    `order_item_registration.payer_national_number`.
    - Both are filled from `extra_data.payer_national_number` (WooCommerce import, step 11);
      the customer gets the number from their latest registration.
    → fiscal-attests, 1b-bis, 1c
25. [x] **Plugin migration `Version-1.2.0.ts`:** `fiscal_attest`, `fiscal_attest_batch`,
    `fiscal_attest_amount_override`, `fiscal_attest_payer`, with CHECK constraints on
    kind/status/source.
    - The fiche number is unique per year among **current** (`final`) attests only (partial
      unique index), because a correction keeps the original fiche number.
    → fiscal-attests, 1d
26. [x] Settings page `/admin/fiscal-attests/settings` (Settings → Fiscal attests).
    - **Fields:** company number (KBO, mod-97 checked, stored digits-only), legal name and
      address (default to the store settings), recognising body (default *Gemeente / stad*)
      with name and reference, signatory, Belcotax sender contact, maximum per day per year.
    - **Code:** settings service `services/fiscalAttest/settings.ts`; admin GraphQL
      `fiscalAttestSettings`.
    → fiscal-attests, 1a
26b. [x] **Eligibility is a product column, not an attribute** (decided).
    - Plugin migration `Version-1.3.0.ts` adds `product.fiscal_attest_eligible boolean NOT NULL
      DEFAULT false`. It converts and removes the earlier `fiscal_attest_eligible` attribute.
    - `Version-1.1.0` no longer creates the attribute.
    - Only for products with **Manage Registrations**.
      - Admin product form: "Fiscal attest (281.86)" in the Status card under Manage
        Registrations. It's disabled, and saved as not eligible, while registrations are off.
      - A plugin processor enforces this on create/update too.
      - Core: `Area` forwards extra props as `areaProps`; new area `productStatusRegistrations`.
      - GraphQL `Product.fiscalAttestEligible`.
    → fiscal-attests, 1b-bis
27. [ ] Mark the camps as eligible: per product in the admin ("Fiscal attest" card → Yes), or
    for every product with a kampweek variant (and registrations) at once:
    ```sql
    UPDATE product SET fiscal_attest_eligible = true
    WHERE manage_registrations AND product_id IN (
      SELECT pv.product_id FROM product_variant pv
      JOIN variant_attribute_value vav ON vav.variant_id = pv.product_variant_id
      JOIN attribute k ON k.attribute_id = vav.attribute_id
      WHERE k.attribute_code IN ('kampweek', 'pa_kampweek')
    );
    ```

## Stage 7: Collecting national numbers & payers

28. [x] **Core:** the checkout participant fields are extensible
    (`camp/services/participantCheckoutFields.ts`).
    - **Available fields:** value processor `availableParticipantCheckoutFields`. Core offers
      `birth_date`; Camp settings loads the list through GraphQL
      `availableParticipantCheckoutFields`.
    - **One shared check:** `collectParticipantExtraData` is used by both add-to-cart APIs
      and the edit-participant API. It checks required fields, then plugins validate or
      normalize through `participantCheckoutExtraData`.
    - **Fixed:** the product page's add-to-cart (`addMineCartItem`) dropped the extra fields,
      and its error response sent the logger instead of the message.
    - **Order creation:** extra fields whose code is a participant column (`birth_date`,
      `national_number`) now fill that column when it's still empty.
      `order_item_registration.customer_id` (the payer) is set too.
    → fiscal-attests, Phase 2
29. [x] **Plugin:** registers the checkout fields `national_number` ("Rijksregisternummer
    kind") and `payer_national_number` ("Rijksregisternummer ouder").
    - **Validation:** mod-97 checked and stored digits-only.
    - **Copying:** core copies the child's number to `participant.national_number`.
      `hookAfter('saveOrderItems')` copies the payer's number to
      `order_item_registration.payer_national_number`, and to `customer.national_number`
      when that's empty.
    - **Enable** both in Camp settings → Participant Fields.
    → fiscal-attests, Phase 2
30. [x] **Payer national number at checkout:** done as the participant field
    `payer_national_number` (step 29) rather than a separate checkout-page component.
    That's the same place the WooCommerce tickets had it ("Rijksregisternummer ouder").
    - Shown wherever the admin enables it, instead of only for dated camps.
    → fiscal-attests, Phase 2
30b. [x] **Payer national number on the checkout page, saved on the customer** (decided).
    - **Field:** "Your national number (rijksregisternummer)" in the payment step, above
      "Place Order" (`pages/frontStore/checkout/PayerNationalNumber.tsx`, area
      `beforePlaceOrderButton`). Shown when the cart has a fiscal-attest camp. Required and
      mod-97 checked, unless "I am not a Belgian national" is ticked. Pre-filled from the
      cart or the logged-in customer.
    - **Saving:** posted with the billing address. The plugin middleware
      `api/addCartAddress/[escapeHtml]savePayerNationalNumber[saveAddress].ts` (runs on
      core's `addCartAddress` route) saves it on the cart (`cart.payer_national_number`,
      migration `Version-1.4.0`) and on the logged-in customer (`customer.national_number`,
      overwritten).
    - **At order time** (`hookAfter('saveOrderItems')`): the checkout number becomes
      `order_item_registration.payer_national_number` for every registration in the order,
      and `customer.national_number`.
    - The per-participant field "Rijksregisternummer ouder" (step 29) is only a fallback now;
      no need to enable it.
31. [x] **Plugin:** "Fiscal data" block on the customer account page.
    - **Edits:** the customer's own national number and their children's (with "not
      applicable"), through API `POST /api/fiscal-data`. That API only allows the
      logged-in customer's own participants.
    - **Privacy fix:** `Participant.nationalNumber` / `Customer.nationalNumber` are only
      returned to an admin user or the participant's own customer. The camp participant
      queries are also reachable through the storefront GraphQL endpoint.
    → fiscal-attests, Phase 2
32. [x] **Payer split** (customer side; admin side in step 36) (`services/fiscalAttest/payers.ts`).
    - **Account block:** "Fiscal attest – split between parents", per child per income year.
      The customer enters the other parent's name, national number, address and share.
    - **Storage:** two `fiscal_attest_payer` rows per registration (customer + other parent).
    - **After final:** once the year's attests are final, a change is stored as
      `status = 'requested'`.
    - **Code:** API `POST /api/fiscal-attest-payers`; GraphQL `Customer.fiscalAttestSplits`.
    - **Still to do (with the admin attest pages, Stage 8):** the admin split form and
      approving/rejecting requests.
    - Income year of a registration = start date of its dated option, else the year at the
      end of its variant title, else the registration date.
    → fiscal-attests, 2b
33. [x] **Plugin:** value processor on `participantMergeBeforeDelete`, in the merge tool's
    transaction. It moves `fiscal_attest.participant_id` to the kept participant and copies
    the national number when the kept one has none.
    - The merge tool is on another branch (commit `2e286c5`); this runs once that's merged.
    → fiscal-attests, Phase 6

## Stage 8: Generating attests

34. [x] `lib/carePeriod.ts` (pure).
    - **Period:** the variant's dated option first, then the product's. Reports missing,
      start-without-end, more than one, and invalid dates.
    - **Days:** `day_count`, or weekdays between the dates.
    - **Also:** age on a date, and a fallback year (variant title year, else registration date)
      for registrations without dates.
    → fiscal-attests, 1b
35. [x] `services/fiscalAttest/collectAttestCandidates.ts` + `buildAttests.ts`.
    - **Collect** (read-only, parameterized SQL): registrations of products with
      `manage_registrations` + `fiscal_attest_eligible`, in the care-period year. Includes:
      - registrations without dates, placed in their fallback year, so they show as issues;
      - order line, order, payer (order customer + billing address);
      - manual amounts and active splits.
      Dated camps not marked eligible are listed separately.
    - **Build** (pure):
      - amount = manual amount > order line (`line_total_with_discount_incl_tax` ÷
        registrations on the line) > blocking "no amount";
      - unpaid orders are left out (warning);
      - blocking: no or bad dates, no birth date, 14 or older on the first day, amount ≤ 0,
        shares ≠ 100%, no payer;
      - warnings: national numbers, days derived, manual amount, above the daily maximum;
      - one attest per child per payer, with the rounding difference to the first payer.
    - **Unit tests:** `buildAttests.test.ts`, 13 tests on `node:test`. Run
      `npm test -w content/plugins/belgian-administration` after compiling.
    - **Not covered:** partial refunds aren't subtracted (oms has no refund amounts), and the
      "under 21 with a disability" exception isn't supported.
    → fiscal-attests, Phase 3
36. [x] Admin page **Fiscal attests → Attests per year** (`/admin/fiscal-attests`).
    - **Page:** year picker, totals, settings check, "Generate attests for YYYY".
    - **Split requests from parents:** approve or reject.
    - **Camps not marked eligible.**
    - **Registrations grid** with filters (blocking, warnings, no amount, no dates, national
      number, age, ready). Per row: period, amount (enter/change/remove a manual amount,
      pre-filled with the variant price), payers (admin split / reset), issues.
    - **Generate** (`generateFiscalAttests`) writes `final` rows with fiche numbers and a
      `data` snapshot (organiser, authority, signatory, child, payer, periods, totals).
      Refused when that year already has final attests, settings are incomplete, or there are
      blocking issues.
    - **APIs (admin):** `GET /api/fiscal-attests/preview?year=`, `POST
      /api/fiscal-attests/generate`, `/amount`, `/payers`, `/payer-requests`.
    - This also finishes step 32's admin side: the split form plus approving/rejecting
      requests. Approving after generation needs a correction (Stage 9).
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

## Extra changes (after Stage 8)

- [x] **Admin product page:** the old "Variant" card (legacy `variant_group`,
  `productEdit/VariantGroup.tsx`) is removed, and so is the "Can not change the attribute
  group… variant group" text in the Attributes card. The new Variants card shows the
  product's **attribute group** and its variant attributes at the top (admin GraphQL
  `Product.variantAttributeGroup`).
  - The storefront still has the legacy variant-group picker (`productView/Variants.tsx`);
    it renders nothing without a legacy variant group.
- [x] **Attribute type "period"** (core catalog migration `Version-1.1.3`): a select whose
  options are periods with start/end dates (and optional days).
  - `select` / `multiselect` are normal choices again; the date fields only show, and are
    only saved, for `period`.
  - Treated like `select` everywhere else: product attribute values, variant options,
    storefront filters.
  - `kampweek` / `pa_kampweek` are converted to `period`; the WooCommerce import creates
    them as `period`.
  - New options of a period attribute require both dates. Existing options without dates
    stay allowed, and the attests page flags them.
- [x] **Variant on/off** (`product_variant.status`, same migration).
  - Admin Variants card: an "Enabled" checkbox and a "disabled" badge.
  - Disabled variants are left out of `bookableVariants` (shop picker). A cart item on a
    disabled variant gets an error, so checkout is blocked.
  - Registrations and attests on a disabled variant are unaffected.
- [x] **WooCommerce customer national number.** The order import reads the custom field
  from the order's or the WooCommerce customer's `meta_data` and fills
  `customer.national_number` when it's still empty.
  - The meta key is a setting ("Customer data" on the WooCommerce settings page); left
    empty, the first key containing "rijksregister" or "national" is used.
  - Only valid Belgian national numbers are imported. WooCommerce customers are fetched
    once per run.

- [x] **"Don't generate a fiscal attest" per order** (plugin migration `Version-1.5.0`, table
  `fiscal_attest_exclusion`).
  - **What:** an order (all its registrations), or a registration without an order, can be
    left out, with a reason (*Not Belgian* / *Organisation* / *Other*) and an optional note.
  - **Where:** set it from the attests overview (per row: "Don't generate for this order" /
    "Include again"; filter and count "Excluded"), or from the admin order page ("Fiscal
    attest" card).
  - **Effect:** `buildAttests` lists excluded registrations without checks and makes no
    attest for them.
  - **Code:** API `POST /api/fiscal-attests/exclusions`; admin GraphQL
    `Order.fiscalAttestExclusion`.
