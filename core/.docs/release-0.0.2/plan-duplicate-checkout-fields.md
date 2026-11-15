# Duplicate "rijksregisternummer" field after enabling it as a checkout field

## Context

From `planning.md` (release 0.0.2, fixes):

> when adding a field rijksregisternumber to the checkout fields in settings > sportscamp. There are
> 2 fields created on customer details. I think there is some duplicate code with two flows in it.

How checkout fields work today:

- **Available fields.** Core offers `birth_date`
  (`core/modules/camp/services/participantCheckoutFields.ts:39-49`). The `belgian-administration`
  plugin adds `national_number` ("Rijksregisternummer kind") and `payer_national_number`
  ("Rijksregisternummer ouder") through the `availableParticipantCheckoutFields` processor
  (`content/plugins/belgian-administration/src/bootstrap.ts:40-48`, registered at `:79`).
- **Configured fields.** In *Settings > Sportscamp* (`core/modules/camp/pages/admin/campSetting/CampSetting.tsx`),
  the admin picks fields from that list. They are saved as the JSON setting `participant_checkout_fields`.
  The picker already prevents the same code from being chosen twice (`CampSetting.tsx:55-56, 108-110`),
  so the setting itself does not contain duplicates.
- **Rendering and storage.** The configured fields are rendered generically in several places:
  - storefront product page "Enter Participant Details" (`core/modules/catalog/pages/frontStore/productView/ParticipantForm.tsx:127-142`)
  - cart edit-participant form (`core/components/frontStore/checkout/cart/items/EditParticipantForm.tsx:71-85`)
  - **admin participant edit/new page** (`core/modules/camp/pages/admin/participantEdit+participantNew/General.tsx:68-80`)

  The values are stored in `cart_item_registration.extra_data` / `order_item_registration.extra_data`.
  When an order is placed, codes that match a `participant` column fill that column if it is still empty
  (`core/modules/checkout/services/orderCreator.ts:119-166`, `fillEmptyParticipantFields`).

The plugin also has its own dedicated, hard-wired national number UI that existed before the
generic checkout-field mechanism:

- admin participant page: `content/plugins/belgian-administration/src/pages/admin/participantEdit+participantNew/NationalNumberField.tsx`
  (area `participantEditGeneral`, sortOrder 25), with the "Not applicable" checkbox and the
  `nationalNumber` validator
- checkout payment step: `content/plugins/belgian-administration/src/pages/frontStore/checkout/PayerNationalNumber.tsx`
  (area `beforePlaceOrderButton`), the payer's number saved on `cart` / `customer` by
  `api/addCartAddress/[escapeHtml]savePayerNationalNumber[saveAddress].ts`
- admin customer page: `pages/admin/customerEdit/CustomerNationalNumber.tsx`
- account page: `pages/frontStore/account/FiscalData.tsx`

## Root cause

There are two separate flows that render the same field, and nothing checks for the overlap.

### 1. Admin participant details: two `national_number` inputs (the reported bug)

When the admin enables **"Rijksregisternummer kind"** (`national_number`) in Settings > Sportscamp:

| Flow | File | What it renders |
|---|---|---|
| Generic checkout-field flow (core) | `core/modules/camp/pages/admin/participantEdit+participantNew/General.tsx:68-80` | One `Field` per configured checkout field, `name={field.code}`, so `name="national_number"`, sortOrder `30 + index*10` |
| Plugin flow | `content/plugins/belgian-administration/src/pages/admin/participantEdit+participantNew/NationalNumberField.tsx:39-55, 60-63` | Its own `name="national_number"` field and the "Not applicable" checkbox, injected into the same `participantEditGeneral` area at sortOrder 25 |

Both end up in the same `<Area id="participantEditGeneral">` (`General.tsx:91`), so the page shows
**two "national number" inputs with the same `name`**.

Effects:

- **Last field wins on save.** `serializeForm` (`includes/lib/util/formToJson.js:34-45`) overwrites
  `data[prefix]` for every entry, so for a duplicated `name` the last input in DOM order wins. Area
  sorts by sortOrder (`includes/components/Area.tsx:85-86`), so the core field (30+) comes after the
  plugin field (25). The value the admin types into the plugin field is **discarded**.
- **The core field starts empty.** `General.tsx`'s GraphQL query (`:102-113`) only fetches
  `firstName`, `lastName`, `birthDate`. It does not fetch `nationalNumber`, so
  `get(participant, 'nationalNumber')` (`:82-84`) is undefined and the generic field renders empty.
  Saving without retyping the number in the *second* field posts `national_number=""`. Then the
  plugin's `participantDataBeforeUpdate` processor (`bootstrap.ts:12-22, 74`) rejects it ("National
  number is invalid…") unless "Not applicable" is ticked. Either way, the stored number can be
  replaced by whatever is in the generic field.
- The generic field has no validation or formatting, while the plugin field has both. The plugin
  validator does **not** normalize to digits (`bootstrap.ts:12-22`, unlike the checkout processor
  at `:53-70`), so a number typed as `85.07.30-033.28` is stored with dots.

The same thing happens on the "New participant" page (same `participantEdit+participantNew` folder).

### 2. Checkout: the payer's number asked twice (same pattern, other field)

When the admin enables **"Rijksregisternummer ouder"** (`payer_national_number`):

- The generic flow asks it **per participant** on the product page / cart
  (`ParticipantForm.tsx:127-142`, `EditParticipantForm.tsx:71-85`) and stores it in `extra_data`.
- The plugin flow asks it **once per order** in the payment step
  (`PayerNationalNumber.tsx:44-72`) for carts with a fiscal-attest-eligible camp
  (`graphql/types/Cart/Cart.resolvers.ts:23-37`).
- `copyPayerNationalNumbers` (`services/payerNationalNumber.ts:18-80`) takes the checkout number
  first and uses the per-participant one only as a fallback, so the per-participant value is
  ignored whenever the payment-step value exists.

The `payer_national_number` field also shows up on the admin participant page through `General.tsx`,
even though `participant` has no such column (`migration/Version-1.0.0.ts`). Whatever is typed there
is never stored on the participant.

### Why it happened

The plugin was written with dedicated UIs (`NationalNumberField`, `PayerNationalNumber`). Later the
same codes were also exposed as generic checkout fields (`bootstrap.ts:36-48`), and
`General.tsx` renders **every** configured field. Both were introduced in `d06a03a belgian
administration (#176)`. Neither side checks whether the other already handles a code.

## Proposed fix

Principle: **a field code has exactly one owner per screen.** The generic flow renders a field
only if no plugin has claimed it for that screen.

1. **Let an available field declare where the generic UI must *not* render it.** Extend
   `AvailableParticipantField` (`core/modules/camp/services/participantCheckoutFields.ts:23-29`) with
   an optional flag, e.g. `adminParticipantForm?: false` (or a more general
   `renderedBy?: 'plugin'`). In `bootstrap.ts:40-43`, set it for `national_number` (the plugin owns
   the admin field through `NationalNumberField`) and for `payer_national_number` (not a participant
   attribute at all).
2. **Expose the flag through GraphQL.** Add it to the `availableParticipantCheckoutFields` type in
   `core/modules/camp/graphql/types/CampSetting/CampSetting.graphql` and its resolver.
3. **Filter in `General.tsx`.** Query `availableParticipantCheckoutFields { code adminParticipantForm }`
   next to `setting.participantCheckoutFields`, and skip configured fields whose definition has
   `adminParticipantForm === false` (`General.tsx:33-41, 68`). Result: one national number input on
   the participant page (the plugin's, with validation and "Not applicable").
   - Alternative (smaller, but couples core to a plugin code): have `General.tsx` skip codes that
     already have a component in `participantEditGeneral`. Not recommended, because Area does not
     expose this cleanly.
4. **Fetch values for the generic fields that remain.** `General.tsx` currently only fetches
   `birthDate`. Any other column-backed field (added later by a plugin) would also render empty.
   Either add a generic `Participant.extraFields`/`attribute(code)` resolver, or document that a
   plugin adding a column-backed field must also set the admin flag from step 1. At least keep
   `birthDate` working.
5. **Payer number at checkout: pick one flow.** Recommended: since one payer per order is the
   model of `copyPayerNationalNumbers`, **remove `payer_national_number` from the selectable checkout
   fields** (`bootstrap.ts:42`) and keep only `PayerNationalNumber.tsx`. Keep the `extra_data`
   fallback in `copyPayerNationalNumbers` (`payerNationalNumber.ts:51-79`) so old orders and
   imports still work. If it must stay selectable (see open questions), hide `PayerNationalNumber`
   when the field is configured, or the other way round. Never show both.
6. **Normalize the admin value.** In `validateNationalNumber` (`bootstrap.ts:12-22`), return
   `national_number` as digits only (same as `validateCheckoutNationalNumbers`) so admin edits are
   stored like checkout values.
7. **Defensive dedupe on save.** Server-side, when saving `participant_checkout_fields`, drop
   duplicate codes and codes that are no longer available (the UI prevents this, but the API does
   not).

## Data cleanup / migration

No duplicate *rows* were created: both inputs share one `name`, so only one value is posted. What
may be wrong is the **content** of `participant.national_number`:

1. **Numbers stored with formatting** (typed into either admin field, not normalized). Plugin
   migration (next version after `Version-1.6.0.ts`):
   ```sql
   UPDATE participant
   SET national_number = regexp_replace(national_number, '\D', '', 'g')
   WHERE national_number ~ '\D';
   ```
2. **Numbers cleared or overwritten by the empty generic field.** These can't be detected with
   certainty. Report candidates where the participant number is empty but a checkout value exists,
   then backfill (same rule as `fillEmptyParticipantFields`: only fill empty columns):
   ```sql
   UPDATE participant p
   SET national_number = src.nn
   FROM (
     SELECT DISTINCT ON (r.registration_participant_id)
            r.registration_participant_id AS participant_id,
            regexp_replace(oir.extra_data::jsonb ->> 'national_number', '\D', '', 'g') AS nn
     FROM order_item_registration oir
     JOIN registration r ON r.registration_id = oir.registration_id
     WHERE oir.extra_data IS NOT NULL
       AND (oir.extra_data::jsonb ->> 'national_number') IS NOT NULL
     ORDER BY r.registration_participant_id, oir.order_item_registration_id DESC
   ) src
   WHERE p.participant_id = src.participant_id
     AND (p.national_number IS NULL OR p.national_number = '')
     AND p.national_number_not_applicable = false;
   ```
   (Before writing this, check the join columns between `order_item_registration` and
   `registration` against the camp/checkout schema.) Run it as a reviewed one-off script or a
   dry-run `SELECT` first, not blindly.
3. **Setting.** Check `participant_checkout_fields` for duplicate codes. If step 5 removes
   `payer_national_number` from the available list, also remove it from the saved setting (a
   migration that rewrites the JSON), otherwise it stays configured but can't be edited.
4. Payer numbers: no cleanup needed. `order_item_registration.payer_national_number` already takes
   the checkout value first (`payerNationalNumber.ts:34-49`).

## Test steps

1. Settings > Sportscamp: add "Rijksregisternummer kind" (and "Date of Birth"). Save.
2. Admin > Participants > edit a participant: exactly **one** national number input (with
   "Not applicable") and the birth date field. The existing number is pre-filled.
3. Change the number to a valid formatted value (`85.07.30-033.28`), save, reload: the value is
   kept and stored as `85073003328`.
4. Enter an invalid number: you get a validation error. Tick "Not applicable" and save: it works.
5. Admin > Participants > New: one national number input, and creating the participant works.
6. Storefront: add a camp to the cart. "Rijksregisternummer kind" is asked once per participant,
   checkout validates it, and after the order `participant.national_number` is filled (if it was
   empty).
7. With the payer field: for a fiscal-attest-eligible camp, the payer number is asked **once**
   (payment step), and `order_item_registration.payer_national_number` and `customer.national_number`
   are filled.
8. Remove the fields from settings: the participant page still shows the plugin's national number
   field (plugin-owned), and the product page no longer asks for it.
9. Disable the belgian-administration plugin: the setting page no longer offers the fields, and
   `General.tsx` still renders `birth_date` correctly.
10. Run the cleanup in dry-run mode on a copy of production and check the counts.

## Open questions

1. Should "Rijksregisternummer ouder" stay selectable as a per-participant checkout field
   (for example, different payers per child)? The fiscal-attest model (`fiscal_attest_payer`,
   `saveFiscalAttestRegistrationPayers`) suggests the payer is handled elsewhere. Recommendation:
   remove it from the list.
2. Should the plugin's admin `NationalNumberField` always be shown (current behavior), or only when
   `national_number` is enabled as a checkout field? The fiscal attest needs it either way, so
   recommendation: always show it.
3. ~~Does "customer details" in the bug report mean the admin participant page or the storefront
   checkout?~~ **Answered (2026-11-15):** the reporter saw the two fields on the **admin participant
   page**. That page is the main fix; the checkout duplicate (payer number asked twice) is a
   related problem fixed in the same plan.
4. Is a generic "plugin owns this field on screen X" flag worth it, or is a single
   `adminParticipantForm: false` enough for now?
