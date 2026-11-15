# Fiscal attests (281.86) & Belcotax

## Context

Belgian parents can deduct childcare costs, including holiday/sports camps, for children under
14 (under 21 with a severe disability). The organiser has to:

1. give the payer a **fiscal attest**, form **281.86** (*attest opvangkosten* / *attestation frais
   de garde*), and
2. submit the same data as a **281.86 fiche** to the FOD Financiën through **Belcotax-on-web**,
   by the deadline for the income year (usually 1 March of the following year; check the yearly
   FOD Financiën notice).

Both come from one stored snapshot per child, per payer, per year.

**About "posting to Belcotax":** Belcotax-on-web has no public REST API. Fiches are sent as an
**XML file that follows the yearly Belcotax XSD**, uploaded through the Belcotax-on-web portal
by someone with the mandate for the organiser's company number (eID/itsme). Scope: **build and
validate the XML in the admin, download it, upload it by hand, and record the result.**

## Delivery: one Belgium-specific plugin

All of this is Belgium-specific, just like the national number. So it doesn't go in
`core/modules/camp`; it goes in a plugin under `content/plugins/`, following
`content/plugins/README.md`.

### Rename `national-number-field` → `belgian-administration`

The national number exists mainly for the attest, and the attest can't work without it. The
plugin system has no way to declare a dependency between plugins, so two separate plugins
(where one silently breaks if the other is disabled) is the wrong split. **Extend the existing
plugin and give it a broader name:** `belgian-administration`. Alternatives: `belgian-tax`,
`fiscal-attest-be`.

Steps for the rename:
1. `git mv content/plugins/national-number-field content/plugins/belgian-administration`.
2. `package.json` → `"name": "evercamps-belgian-administration"`, new description. Run
   `npm install` from the root so the workspace link is updated.
3. `config/default.json` → `system.extensions`: change `name` and `resolve`.
4. **Migrations are tracked by plugin name** (`includes/bin/lib/bootstrap/migrate.js` keys the
   `migration` table on `module`). After the rename, `Version-1.0.0.ts` runs again under the new
   name. That's safe because it only uses `ADD COLUMN IF NOT EXISTS`. Keep every new migration
   idempotent as well. Optional cleanup: `DELETE FROM migration WHERE module = 'national-number-field'`.
5. A `plugin_enabled.national-number-field` override in `setting` (from `/plugin-management`)
   no longer applies. The new name starts from the config default, so delete the old row.
6. Update both READMEs: the plugin's own, and the example list in `content/plugins/README.md`.

### Target layout

```
content/plugins/belgian-administration/
├── package.json / tsconfig.json / README.md
└── src/
    ├── bootstrap.ts               # existing nationalNumber processors + new hooks (below)
    ├── core.ts                    # NEW: re-exports from root dist/ (same pattern as woocommerce-import)
    ├── lib/
    │   ├── nationalNumber.ts      # existing mod-97 validator (reused for payer + child)
    │   ├── companyNumber.ts       # KBO mod-97 validator
    │   └── carePeriod.ts          # resolves a registration's dated period option (core attribute_option)
    ├── services/
    │   ├── settings.ts            # getFiscalAttestSettings()
    │   ├── collectAttestCandidates.ts
    │   ├── buildAttests.ts        # pure → unit-testable
    │   ├── generateFiscalAttests.ts
    │   ├── renderAttestPdf.ts
    │   └── belcotax/<incomeYear>/buildBelcotaxXml.ts
    ├── api/                       # previewFiscalAttests, generateFiscalAttests, exportBelcotaxBatch, …
    ├── graphql/types/
    │   ├── Participant/           # existing nationalNumber extension
    │   ├── FiscalAttest/          # *.admin.graphql + resolvers
    │   └── FiscalAttestSetting/
    ├── pages/
    │   ├── admin/participantEdit+participantNew/NationalNumberField.tsx   # existing
    │   ├── admin/all/FiscalAttestMenuItem.tsx       # item in the Camp menu group / settingPageMenu card
    │   ├── admin/fiscalAttestSettings/              # route.json + settings form
    │   ├── admin/fiscalAttests/                     # year overview, preview, batches
    │   └── frontStore/account/FiscalAttests.tsx     # customer download list
    └── migration/
        ├── Version-1.0.0.ts       # existing participant.national_number columns
        ├── Version-1.1.0.ts       # payer national number (care dates live in core, see 1b)
        └── Version-1.2.0.ts       # fiscal_attest, fiscal_attest_batch, amount override + payer tables
```

Framework imports (`pool`, `getSetting`, `hookable`/`hookAfter`, `select`/`insert`, the mailer,
`uploadFile`, …) all go through `src/core.ts`.

## What the 281.86 needs vs. where it comes from

| 281.86 data | Source | Status |
|---|---|---|
| Organiser: name, address, company number (KBO) | `store*` settings + plugin setting `fiscalAttestCompanyNumber` | **New plugin setting** |
| Recognising/supervising body + reference | plugin settings | **New plugin setting** |
| Child: first/last name, birth date | `participant.first_name/last_name/birth_date` | Exists; birth date must be required for eligible camps |
| Child: national number | `participant.national_number` / `national_number_not_applicable` (this plugin) | **Exists**, but only set from the admin form (see Phase 2) |
| Payer: name, address | order billing address snapshot | Exists |
| Payer: national number | — | **New**, in this plugin |
| Care period from–to, number of days | `attribute_option.start_date/end_date/day_count` on the period option (e.g. *Week 1 zomer*) | **New core columns** (Phase 1b) |
| Amount paid | manual override, else `order_item` + `order.payment_status` (`paid`, `partial_refunded`, `refunded`) | Exists; imported registrations need linking (Phase 2c) |
| Eligible camp | column `product.fiscal_attest_eligible` | **New column** (Phase 1b-bis) |
| Payer split between parents | `fiscal_attest_payer` (customer dashboard / admin) | **New** (Phase 2b) |

How it links up: `order` → `order_item` → `order_item_registration` (`registration_id`,
`customer_id`, `extra_data`) → `registration` (`registration_product_id`, `product_variant_id`) →
`participant`.

## Phase 1: Settings, attributes, schema

### 1a. Settings page (`pages/admin/fiscalAttestSettings`)

Same pattern as `woocommerce-import`'s `wooCommerceSettings` (a card in `settingPageMenu`,
values in the `setting` table, `services/settings.ts` reads them):
- `fiscalAttestCompanyNumber` (KBO, validated mod-97), `fiscalAttestLegalName`,
  `fiscalAttestAddress` (default to the `store*` settings)
- **Recognising body: one setting for all camps** (decided: every camp is recognised by the
  municipality).
  - `fiscalAttestAuthorityType`: a select, default **municipality**. The other options (Opgroeien
    / ONE / school / recognised sports federation) stay available but aren't expected to be used.
  - `fiscalAttestAuthorityName`: the municipality, e.g. "Gemeente X".
  - `fiscalAttestAuthorityReference`: optional recognition/agreement reference, if the
    municipality gives one.
  - These values are printed in the recognition box of every PDF and written into every fiche.
    No per-camp attribute is needed.
- `fiscalAttestSignatoryName` / `fiscalAttestSignatoryFunction`
- `fiscalAttestSenderContactName` / `Email` / `Phone`: the contact person written into the
  sender block of the Belcotax XML. It can be anyone; it doesn't have to be the person who
  uploads.
- `fiscalAttestMaxDailyRate` per year (`{ "<year>": <amount> }`). The ceiling is indexed every
  year, so don't hard-code it.

### 1b. Care dates on the period option (core catalog change)

Camps already use a **`period`** select attribute (seeded in `catalog/migration/Version-1.0.0.ts`)
with options like *Week 1 zomer*, *Week 2 zomer*. It's shown on the frontend and used as a
search filter (`is_filterable`). The dates belong to **each option**, not to the attribute:
*Week 1 zomer* = 6–10 July, *Week 2 zomer* = 13–17 July. So the columns go on
**`attribute_option`**, not on `attribute`.

This works for both ways a product links to an option:
- a product without variants → `product_attribute_value_index.option_id`
- a variant → `variant_attribute_value.option_id`. This also fixes the earlier "dates can't
  differ per variant" problem.

Dates per week are general camp information, useful for display, sorting and "upcoming"
filters, not only for Belgian tax. So this is a **core catalog change** (a new
`catalog/migration/Version-1.1.1.ts`), not something the plugin adds:

```sql
ALTER TABLE attribute_option
  ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS end_date   DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS day_count  INT  DEFAULT NULL,   -- care days; NULL = weekdays between start/end
  ADD CONSTRAINT attribute_option_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);
```

`attribute_option.value_date` / `value_int` (added in `Version-1.0.9.ts`) are left as they are.
This feature doesn't use them; it uses the explicit columns above.

Core changes this needs:
- **Attribute edit page** (`pages/admin/attributeEdit+attributeNew/General.tsx`, `Options`):
  next to each option's text, add *start date*, *end date* and *days* inputs
  (`options[i][start_date]` …), shown for `select`/`multiselect` attributes.
- **Services:** `createProductAttribute.insertAttributeOptions` and
  `updateProductAttribute.updateAttributeOptions` write the three columns. Option IDs are
  already kept stable on update (update-in-place, delete only removed ones), so existing
  variant and product links survive edits.
- **GraphQL:** `AttributeOption { startDate, endDate, dayCount }`, so the storefront can show
  "Week 1 zomer (6–10 jul)" later.
- Validation: `end_date >= start_date`, and `day_count` between 1 and `end − start + 1`.

Rules used by the plugin (`lib/carePeriod.ts`):
- **A registration's care period** = the dated option on its variant
  (`registration.product_variant_id` → `variant_attribute_value` → `attribute_option`), or
  otherwise the dated option on its product (`product_attribute_value_index`). This doesn't
  depend on the attribute code, so a second dated attribute (e.g. *Krokus*, *Pasen*) works too.
- **Eligibility** = the product's `fiscal_attest_eligible` attribute is *Ja* (see 1b-bis) **and**
  the registration resolves to an option with `start_date`. Products without a dated option
  (merchandise, …) never produce an attest.
- `day_count` NULL → count the weekdays between start and end (inclusive), shown as a warning in
  the preview.
- **Blocking issues:** more than one dated option on the same registration (e.g. a product
  without variants that has several weeks in a multiselect), or an option with `start_date` but
  no `end_date`.

### 1b-bis. Eligibility per camp: product column (plugin)

Not every camp qualifies; residential camps with overnight stays may not, for example. So
eligibility is set **per product** by the admin, as a column on `product` (decided: not a
catalog attribute):

- `product.fiscal_attest_eligible boolean NOT NULL DEFAULT false`, added by the plugin migration
  `Version-1.3.0.ts`. That migration also converts and removes the `fiscal_attest_eligible`
  select attribute that an earlier `Version-1.1.0` created.
- Only possible for products with **Manage Registrations** enabled.
  - Set on the admin product form in the **Status card**, right under "Manage Registrations"
    (plugin `pages/admin/productEdit+productNew/FiscalAttestEligible.tsx` in the core area
    `productStatusRegistrations`). The choice is disabled, and saved as "not eligible", while
    Manage Registrations is off.
  - The plugin's `productDataBeforeCreate`/`Update` processors enforce the same rule
    server-side (API, importer).
  - Saved by core `createProduct`/`updateProduct` like any other product column.
  - GraphQL: `Product.fiscalAttestEligible`.
  - Core change for this: `Area` passes extra props to its components as `areaProps`, and the
    Status card keeps the live Manage Registrations value and offers that area.
- Product-level only. Eligibility doesn't differ between weeks of the same camp.
- A camp with a dated period that is **not** marked eligible = **warning** in the preview, so
  forgotten camps get noticed. They're left out until marked eligible.

### 1c. Payer national number (`Version-1.1.0.ts`)

- `customer.national_number varchar NULL`
- `order_item_registration.payer_national_number varchar NULL`, a snapshot so later profile
  edits don't change historic attests.

Privacy: these are GDPR special identifiers, and the existing column is plain text. At minimum,
mask the number in grids and lists (`85.07.30-***.**`), only show it on edit pages, and never
expose it in storefront GraphQL except to the owning customer. Encrypting at rest (AES-GCM with a
key from env, applied to both participant and payer columns) is a separate follow-up migration.

### 1d. Attest tables (`Version-1.2.0.ts`)

```sql
CREATE TABLE IF NOT EXISTS fiscal_attest_batch (
  fiscal_attest_batch_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid UUID NOT NULL DEFAULT gen_random_uuid(),
  income_year SMALLINT NOT NULL,
  kind VARCHAR(20) NOT NULL,            -- 'original' | 'correction' | 'cancellation'
  status VARCHAR(20) NOT NULL,          -- 'exported' | 'submitted' | 'accepted' | 'rejected'
  xml_file TEXT NULL,
  belcotax_reference VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS fiscal_attest (
  fiscal_attest_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid UUID NOT NULL DEFAULT gen_random_uuid(),
  income_year SMALLINT NOT NULL,
  sequence_number INT NOT NULL,         -- fiche number, needed for corrections
  participant_id INT NULL REFERENCES participant(participant_id) ON DELETE SET NULL,
  customer_id INT NULL REFERENCES customer(customer_id) ON DELETE SET NULL,
  batch_id INT NULL REFERENCES fiscal_attest_batch(fiscal_attest_batch_id),
  status VARCHAR(20) NOT NULL,          -- 'final' | 'corrected' | 'cancelled'
  replaces_attest_id INT NULL REFERENCES fiscal_attest(fiscal_attest_id),
  data JSONB NOT NULL,                  -- full snapshot: organiser, child, payer, periods[], totals
  total_amount NUMERIC(12,2) NOT NULL,
  total_days INT NOT NULL,
  pdf_path TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- A correction keeps its fiche number, so the number is unique per year among
-- the current attests only:
CREATE UNIQUE INDEX ON fiscal_attest (income_year, sequence_number) WHERE status = 'final';

-- Manual amount for a registration, set by the admin (imported/historic data, special prices).
-- Takes precedence over the amount derived from order_item.
CREATE TABLE IF NOT EXISTS fiscal_attest_amount_override (
  registration_id INT PRIMARY KEY REFERENCES registration(registration_id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  note TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Who pays which share of a registration. No rows = 100% the order customer (the default).
CREATE TABLE IF NOT EXISTS fiscal_attest_payer (
  fiscal_attest_payer_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  registration_id INT NOT NULL REFERENCES registration(registration_id) ON DELETE CASCADE,
  customer_id INT NULL REFERENCES customer(customer_id) ON DELETE SET NULL, -- set when the payer has an account
  full_name VARCHAR(255) NOT NULL,
  national_number VARCHAR(11) NULL,
  address JSONB NOT NULL,               -- street, postcode, city, country
  share_percent NUMERIC(5,2) NOT NULL CHECK (share_percent > 0 AND share_percent <= 100),
  source VARCHAR(20) NOT NULL,          -- 'customer' (account page) | 'admin'
  status VARCHAR(20) NOT NULL,          -- 'active' | 'requested' (after the year's attests are final)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

The `data` snapshot is the single source for the PDF, the XML and any correction. The
override and payer tables are inputs: they're read during generation and copied into the snapshot.

## Phase 2: Collecting national numbers at checkout

Today the plugin only covers the **admin** participant form. Its `participantDataBeforeCreate`/
`Update` processors don't run at checkout, because `orderCreator.saveOrderItems` inserts into
`participant` directly. Changes needed:

- **Child, at checkout:** the storefront `ParticipantForm` renders the admin-configured
  `participant_checkout_fields`, chosen from a list that's hard-coded in core
  (`AVAILABLE_PARTICIPANT_FIELDS` in `camp/pages/admin/campSetting/CampSetting.tsx`).
  - **Small core change (approved):** make that list extensible through a value processor
    (e.g. `getValueSync('availableParticipantCheckoutFields', [...])`, with the server side
    reading the same list), so the plugin can register `national_number`.
  - The admin then enables it in Camp settings like `birth_date`. The value lands in
    `order_item_registration.extra_data.national_number`.
  - **Plugin:** `hookAfter('saveOrderItems', …)` validates it with `isValidNationalNumber` and
    copies it to `participant.national_number` when that's still empty. `saveOrderItems` is
    already wrapped in `hookable` (`checkout/services/orderCreator.ts`).
- **Payer, at checkout:** (as built) a second participant field, `payer_national_number`
  ("Rijksregisternummer ouder"), the same place the WooCommerce tickets asked it. The plugin's
  `hookAfter('saveOrderItems')` copies it into `order_item_registration.payer_national_number`
  and, when empty, into `customer.national_number`. The child's `national_number` is copied
  to the participant by core, which fills empty participant columns from the extra fields.
- **Afterwards:** a "Fiscal data" block in the customer account
  (`pages/frontStore/account/`, area `accountPageInfo`) to fill in or fix the payer's and
  children's numbers. Imported and older registrations will mostly be missing them.

### 2b. Splitting the attest between parents (customer dashboard + admin)

By default the payer is the order customer, for 100%. Separated parents often want each to get
an attest for their own share. This can be done in two places, both writing
`fiscal_attest_payer` rows:

- **Customer dashboard** (`pages/frontStore/account/FiscalAttestPayers.tsx`): per child, per
  year, "Split the fiscal attest with the other parent". The customer enters the other parent's
  name, national number, address and their share (%). The customer's own share is the rest.
  - **Before the year's attests are generated:** saved as `status = 'active'` and used directly
    in generation.
  - **After the attests are final:** saved as `status = 'requested'`. It shows up in the admin as
    a correction request, and the admin approves it, which runs the Phase 6 correction flow.
    Customers never change a submitted fiche themselves.
  - API (`access: "public"`, checks the logged-in customer owns the registration):
    `saveFiscalAttestPayers`.
- **Admin** (`pages/admin/fiscalAttests`, preview grid): the same split form, per registration.
  Saved as `source = 'admin'`, plus a list of open customer requests to approve or reject.

Validation: shares per registration add up to 100%, and each national number passes
`isValidNationalNumber`. At most one row with no account is expected (the other parent).

Generation then makes one attest per **(child, payer)**, each with the payer's share of the
amount (rounded to the cent; any rounding difference goes to the order customer).

### 2c. Linking imported registrations to their order line (`woocommerce-import` plugin)

Imported orders **do** have the paid amount: `runOrderImport.ts` writes `order_item` with
`line_total_with_discount(_incl_tax)` from WooCommerce. However, `importParticipantsForOrder` →
`createOrUpdateRegistration` never writes **`order_item_registration`**, so the registration
isn't linked to the order line it was paid on, and the generation query below can't find it.

- **Fix the import:** after the `order_item` insert, keep its `insertId` per line item and pass it
  to `importParticipantsForOrder`. When a registration is created or found, insert an
  `order_item_registration` row (`order_item_id`, `registration_id`, `first_name`, `last_name`,
  `customer_id`) if there isn't one yet. On re-import/update (the existing-order path), look up
  the `order_item` by `order_id` + `product_id` + `product_variant_id`.
- **Backfill for data that's already imported:** re-run the order import once (**done** in the
  code; see `plan-variant-import.md`, steps 11–12). Every run fetches all WooCommerce orders,
  and already-imported orders go through the update path, which now writes the missing links.
  It uses the real WooCommerce line items, so no matching by customer/product is needed. The
  import also stores the parent's national number ("Rijksregisternummer ouder") in
  `order_item_registration.extra_data.payer_national_number`, for 1c to promote later.
- **Product price is not used as the amount.** It's the list price, not what was paid
  (discounts, sibling prices, coupons). The imported `order_item` amount is the right one. For
  registrations that still have no order line after the backfill, the product/variant price is
  only **pre-filled as a suggestion** in the manual amount field (see Phase 3). The admin
  confirms or changes it.

## Phase 3: Generation service

`services/collectAttestCandidates.ts` (read-only):

```sql
-- one row per registration whose dated period option starts in the income year
WITH reg_period AS (
  -- variant option first, product option as fallback
  SELECT r.registration_id, ao.attribute_option_id, ao.option_text AS period_label,
         ao.start_date, ao.end_date, ao.day_count, 1 AS source_rank
  FROM registration r
  JOIN variant_attribute_value vav ON vav.variant_id = r.product_variant_id
  JOIN attribute_option ao ON ao.attribute_option_id = vav.option_id AND ao.start_date IS NOT NULL
  UNION ALL
  SELECT r.registration_id, ao.attribute_option_id, ao.option_text,
         ao.start_date, ao.end_date, ao.day_count, 2
  FROM registration r
  JOIN product_attribute_value_index pav ON pav.product_id = r.registration_product_id
  JOIN attribute_option ao ON ao.attribute_option_id = pav.option_id AND ao.start_date IS NOT NULL
)
SELECT r.registration_id, p.*, oir.payer_national_number, oir.customer_id,
       o.order_id, o.payment_status, oi.*, <billing address>, rp.*,
       ov.amount AS override_amount
FROM registration r
JOIN reg_period rp                     ON rp.registration_id = r.registration_id
JOIN participant p                     ON p.participant_id = r.registration_participant_id
JOIN product pr                        ON pr.product_id = r.registration_product_id
                                          AND pr.fiscal_attest_eligible AND pr.manage_registrations
LEFT JOIN order_item_registration oir  ON oir.registration_id = r.registration_id
LEFT JOIN order_item oi                ON oi.order_item_id = oir.order_item_id
LEFT JOIN "order" o                    ON o.order_id = oi.order_item_order_id
LEFT JOIN fiscal_attest_amount_override ov ON ov.registration_id = r.registration_id
WHERE (o.payment_status IN ('paid', 'partial_refunded') OR ov.registration_id IS NOT NULL)
  AND extract(year FROM rp.start_date) = $year   -- care-period year (decided), not payment year
-- buildAttests keeps the lowest source_rank per registration; >1 option at that rank = blocking issue
-- a second, similar query lists dated registrations where eligibility isn't set → warning
-- registrations with no order line and no override come back too (o.* NULL) → blocking "no amount"
```

`services/buildAttests.ts` (pure function):
1. **Amount per registration**, first match wins:
   1. `fiscal_attest_amount_override.amount` (set by hand by the admin)
   2. the `order_item` amount after discount (`line_total_with_discount_incl_tax`), divided by
      the number of registrations linked to that item, minus partial refunds
   3. nothing → **blocking "no amount"**. The admin enters it in the preview grid, pre-filled
      with the product/variant price as a suggestion. Saving writes the override.
2. **Issues** per registration:
   - **Blocking:** child is 14 or older on `care_start`, or no birth date; dates are missing or
     unparseable; no amount, or amount ≤ 0; payer shares don't add up to 100%.
   - **Warning:** no child or payer national number (or `national_number_not_applicable`);
     `day_count` empty, so days were derived from the weekdays between start and end; a dated
     camp that isn't marked `fiscal_attest_eligible`; the amount comes from an override.
3. **Split by payer** (`fiscal_attest_payer` rows with `status = 'active'`, or 100% the order
   customer when there are none), then **group** by `(participant, payer)`, with one period line
   per camp (from, to, days, daily rate, the payer's share of the amount).
4. **Daily-rate ceiling:** store the actual amount paid and the daily rate. As far as I know the
   tax office applies the ceiling, not the organiser; confirm this in the yearly 281.86
   instructions. Show "above ceiling" in the admin as information.
5. Return `{ attests, issues }` without writing anything.

`services/generateFiscalAttests.ts`: transactional, wrapped in `hookable`, with
`mode: 'preview' | 'commit'`. Commit writes `final` rows and gives out `sequence_number`s. It
refuses to run if final attests already exist for that year; use corrections instead (Phase 6).

## Phase 4: PDF attests for parents

*Built (Stage 9).*

- `services/fiscalAttest/pdf.ts`: a 281.86-style A4 page per fiche (organiser, recognition,
  payer, child, periods with days/daily rate/amount, declaration, signatory), rendered with
  `pdfkit` (plugin dependency). Rendered on request from the stored snapshot; nothing is saved
  (`pdf_path` stays empty).
- Customer account: `pages/frontStore/account/FiscalAttests.tsx` lists the customer's current
  fiches once exported to Belcotax (GraphQL `customer.fiscalAttests`, owner/admin only), with
  `GET /api/my-fiscal-attests/:uuid/pdf` (checks `customer_id`). A co-parent with an account
  (matched by `customer_id`) sees their own attest.
- Admin: PDF per fiche and one PDF with all current fiches of a year.
- **Not built:** email (no mailer in the app), ZIP download.

## Phase 5: Belcotax XML export

*Built (Stage 9).*

- `services/fiscalAttest/fiches.ts`: an attest with more than 4 periods is split into several
  fiches (`key` = child + payer + `#n`), each its own volgnummer. `fiscal_attest.data` is the
  `FicheData` snapshot (organiser, recognising body incl. company number/address, signatory,
  child, payer, periods).
- `services/fiscalAttest/belcotax/xml.ts`: Verzendingen > Verzending (v00xx) > Aangiften >
  Aangifte (a10xx) > Opgaven > Opgave32586 > Fiche28186, then r80xx/r90xx totals. Zone order
  follows the Tactics/FodAttest28186 library; amounts in cents, dates DD-MM-YYYY.
  - `f2028`: 0 original, 1 modification, 2 addition, 3 cancellation; `v0025`: 0 for the
    year's first upload, 1 after that. `v0010`: `BELCOTST` (test) / `BELCOTAX`.
  - `f86_2031` from the authority type (municipality → 2, Opgroeien/ONE → 1, school → 4).
  - Payer name split (customers only have a full name): the child's last name if the full
    name starts/ends with it, else first word = first name.
  - Totals: r8010 = fiches + 2, r8011/r9012 = sum of volgnummers, r8012/r9013 = sum of
    2 × fiche total, r9011 = fiches + 4.
  - No XSD validation in the app; check each new income year with the test environment.
- `services/fiscalAttest/batches.ts`: export (test = file only; production = batch +
  linked fiches), XML download, status + reference, rejected → fiches pending again, and
  "discard" for everything not exported yet.

## Phase 6: Corrections & cancellations

*Built (Stage 9).* `services/fiscalAttest/corrections.ts`

- Only when every current fiche was exported, settings are complete and there are no blocking
  issues (a blocked registration would otherwise look like a cancellation).
- Compares the current build (chunked) with the current fiches by `key` using a fingerprint
  (child, payer, recognising body, period dates/days/amounts):
  - changed → **modification**: new `final` row, same volgnummer, `replaces_attest_id`; the
    old row becomes `corrected`.
  - new → **addition**: next volgnummer.
  - gone (refund, exclusion, split change) → **cancellation**: a `cancelled` row with the old
    content and same volgnummer; the old row becomes `corrected`.
- The new rows are pending until exported as the next batch. Parents download the new PDF.
- **Merge tool:** the plugin registers `hookAfter('mergeParticipants', …)` (already `hookable`
  in `camp/services/participant/mergeParticipants.ts`) to repoint
  `fiscal_attest.participant_id` from the duplicate to the survivor. It also copies the
  survivor's `national_number` from the duplicate when the survivor has none. Core stays
  unaware of the plugin.

## Phase 7: Admin UI

- **Menu:** `pages/admin/all/FiscalAttestMenuItem.tsx` adds "Fiscal attests" inside the core
  **Camp** group: `NavigationItemGroup` renders its items in an `Area` with the group's id
  (`campMenuGroup`), so plugins can add items there. A settings card goes in `settingPageMenu`.
- **`/fiscal-attests?year=YYYY`:** counts, blocking issues (linking to the participant, customer
  or product to fix), and **Preview**.
- **Preview grid:** filters for missing national number, age ≥ 14, period options without dates
  (linking to the attribute edit page), eligibility not set, and **no amount**.
  - Per registration: an **amount field** (pre-filled with the product/variant price when there's
    no order line; saving writes `fiscal_attest_amount_override`) and the **payer split** form (2b).
  - A "remind parents" email for missing data.
- **Payer requests:** customer split requests made after the attests are final
  (`fiscal_attest_payer.status = 'requested'`), with approve (→ correction, Phase 6) or reject.
- **Generate** → below the preview (`components/admin/FiscalAttestBelcotax.tsx`): generated
  fiches with PDFs, **Belcotax** (test file, export, batches with status/reference/XML,
  discard) and **Corrections** (check, review, create).

API routes under `src/api/*` (`access: "private"`): `previewFiscalAttests`,
`generateFiscalAttests`, `exportBelcotaxBatch`, `updateBelcotaxBatchStatus`,
`correctFiscalAttest`, `sendFiscalAttests`, `saveFiscalAttestAmount`, `saveFiscalAttestPayers`
(admin), `reviewFiscalAttestPayerRequest`. Customer-facing (`access: "public"`, checks
ownership): `saveFiscalAttestPayers`.

## Phase 8 (optional): Reminder cron

A job registered from the plugin's `bootstrap.ts` through `includes/lib/cronjob` (`registerJob`)
emails the admin from 1 January: open issues, whether attests are generated yet, and the
deadline. No automatic upload.

## Testing

- `buildAttests`: allocation across qty, discounts, partial refunds, the age limit on the start
  date, grouping by child+payer, multiple camps per child, a missing `day_count` fallback.
  Amount order (override > order line > blocking), a 60/40 payer split including cent
  rounding, eligibility not set → warning and left out.
- `woocommerce-import`: a new import writes `order_item_registration`; the backfill links the
  clear cases and reports the ambiguous ones (several participants ≠ `qty`).
- Payer split API: a customer can't edit another customer's registration; a split becomes a
  `requested` row once the year's attests are final.
- `carePeriod`: a variant option wins over a product option; products without variants; no
  dated option (not eligible); several dated options (blocking); start without end.
- Catalog: creating/updating attribute options keeps `start_date`/`end_date`/`day_count`, and
  option IDs stay stable (variant links survive).
- National number / KBO validators (the existing validator, plus the company number).
- An XML snapshot of a fixed dataset, plus XSD validation.
- A rename smoke test: after the rename, boot against a DB that already has the
  `national-number-field` migration. Version-1.0.0 runs again without errors and the data is
  still there.
- An end-to-end dry run on a copy of last year's data, uploaded to the Belcotax test environment.

## Decisions

1. **Plugin name:** `belgian-administration`, since it can hold other Belgium-specific
   features later. Fiscal-attest code lives in a `fiscalAttest` sub-folder of `services/`,
   `api/` and `pages/`.
2. **`attribute_option.value_date` / `value_int`:** left as they are; not used by this feature.
3. **Core change for checkout:** approved. `AVAILABLE_PARTICIPANT_FIELDS` becomes extensible
   through a processor (Phase 2).
4. **Eligible camp types:** set per camp with the `product.fiscal_attest_eligible` column
   (Phase 1b-bis).
5. **Payer:** the order customer by default. A split between parents can be set from the
   customer dashboard and by the admin (Phase 2b).
6. **Historic/imported data:** the amount comes from the imported `order_item` once the
   registration is linked to it (Phase 2c). When there's still no amount, the admin enters it by
   hand, pre-filled with the product price as a suggestion (Phase 3).
7. **Belcotax-on-web mandate:** **not needed to build the XML or the PDFs.** It's only needed
   for the yearly upload step. The XML only needs a sender contact (name, email, phone), which
   is a setting (Phase 1a). Who uploads is an organisational question, not something to decide
   in code.
8. **Recognition:** every camp is recognised by the **municipality**. That's one setting
   (`fiscalAttestAuthorityType` = municipality + `fiscalAttestAuthorityName` + optional
   reference, Phase 1a), printed on every attest. No per-camp attribute.
9. **Income year = care-period year.** A registration goes on the attest for the year its
   period option's `start_date` falls in, whenever it was paid (e.g. paid in December 2025 for
   a camp in July 2026 → 2026 attest). This is a single `WHERE` clause in
   `collectAttestCandidates` (Phase 3). An order that's still unpaid when the attests are
   generated is left out and can be added later with a correction.
   - Edge case: a camp that runs over New Year (e.g. 29 Dec – 2 Jan) goes entirely into the
     start year.

## Open questions

None at the moment. Before going live, check two things with the accountant: whether the FOD
accepts care-period-year attests for camps paid in a different year, and whether the tax office
(not the organiser) applies the daily-rate ceiling (Phase 3, step 4).
