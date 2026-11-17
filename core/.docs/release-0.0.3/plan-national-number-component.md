# National number (rijksregisternummer) component

## Context

From `planning.md` (release 0.0.3, features):

> rijksregisternumber-component: now a text field is used for the rijksregisternumber. there should be
> validation on the frontend with proper feedback. There should also be a nice mask to it. Be sure this
> component is used in every place where the national number field is being used and that it is
> rendered properly.

Today the national number is typed into **eight different inputs**, built in four different ways
(generic `Field`, plugin `Field` + custom validator rule, raw `<input>` with inline check, raw
`<input>` with no check). None of them has a mask. Three of them have no frontend validation at all.
The format helper is copy-pasted three times, and the checksum is implemented twice (plugin and
woocommerce-import).

### Status of the 0.0.2 plan

`core/.docs/release-0.0.2/plan-duplicate-checkout-fields.md` is **not implemented** yet (checked
against `master` at `64c5501`; no commit touches it after `d06a03a belgian administration (#176)`):

- `General.tsx` still renders every configured checkout field, including `national_number`
  (`core/modules/camp/pages/admin/participantEdit+participantNew/General.tsx:68-80`), so the admin
  participant page still shows two national number inputs.
- There is no `adminParticipantForm` / `renderedBy` flag (`core/modules/camp/services/participantCheckoutFields.ts:23-29`).
- `validateNationalNumber` still does not normalize to digits
  (`content/plugins/belgian-administration/src/bootstrap.ts:12-22`).
- `payer_national_number` is still selectable as a checkout field (`bootstrap.ts:42`).

This plan depends on steps 1-3, 5 and 6 of that plan. They are repeated in step 0 below so both
can be done in one branch.

## Current inventory

Paths below are relative to `content/plugins/belgian-administration/src/` (**BA**) unless they start
with `core/`, `includes/` or `content/`.

### Inputs

| # | Where (file:line) | Flow / screen | Input | Frontend validation | Formatting |
|---|---|---|---|---|---|
| 1 | `core/modules/catalog/pages/frontStore/productView/ParticipantForm.tsx:127-142` | Storefront product page, "Enter Participant Details" modal. Generic checkout field (`national_number`, `payer_national_number`) | `Field type="text"`, no placeholder for non-date fields | Only `notEmpty` if required | None. Posted as typed; backend normalizes |
| 2 | `core/components/frontStore/checkout/cart/items/EditParticipantForm.tsx:71-87` | Cart, edit participant modal. Generic checkout field | `Field type="text"` | Only `notEmpty`, and **not even run**: the Save button calls `updateRegistration` directly (`core/components/frontStore/checkout/cart/items/Items.tsx:236-240`), bypassing `Form.validate` | None |
| 3 | `core/modules/camp/pages/admin/participantEdit+participantNew/General.tsx:68-80` | Admin participant edit/new. Generic checkout field (duplicate of #4, see 0.0.2 plan) | `Field type="text"` | `notEmpty` if required | None; value never loaded (query `:102-114` has no `nationalNumber`) |
| 4 | `BA/pages/admin/participantEdit+participantNew/NationalNumberField.tsx:39-55` | Admin participant edit/new (area `participantEditGeneral`, sortOrder 25) | `Field type="text"` + "Not applicable" checkbox | Rule `nationalNumber` added at runtime (`:29-35`), on submit only | Prefilled with raw digits (`:44`), not formatted |
| 5 | `BA/pages/frontStore/checkout/PayerNationalNumber.tsx:54-70` | Checkout payment step, payer (area `beforePlaceOrderButton`) | `Field type="text"` + "I am not a Belgian national" | Rule `payerNationalNumber` (`:36-42`), on submit only | Prefill formatted by local `format()` (`:23-28`) |
| 6 | `BA/pages/admin/customerEdit/CustomerNationalNumber.tsx:166-173` | Admin customer page, inline edit | Raw `<input>` | Live `isValidNationalNumber` (`:122, 173`), Save disabled when invalid | Local `format()` (`:15-20`) |
| 7 | `BA/pages/frontStore/account/FiscalData.tsx:94-101, 111-121` | Account page "Fiscal data": own number + one per child (with "Not applicable") | Raw `<input>`s | Live check (`:49, 102-104, 122-124`) | Local `format()` (`:27-32`) |
| 8 | `BA/pages/frontStore/account/FiscalAttestPayers.tsx:77-91, 151` | Account page, other parent of a split attest | Raw `<input>` via `field()` helper | Live check (`:93, 155-159`) | None |
| 9 | `BA/pages/admin/fiscalAttests/FiscalAttests.tsx:523-528` | Admin fiscal attests, edit payers of a registration | Raw `<input placeholder="National number">` | **None** (server only) | None |

### Read-only display

| Where (file:line) | What | Formatting |
|---|---|---|
| `core/components/frontStore/checkout/cart/items/Items.tsx:140-145` | Cart: `{field.label}: {val}` for every extra field | Raw (digits after save) |
| `BA/pages/admin/customerEdit/CustomerNationalNumber.tsx:151` | Admin customer, saved value | Local `format()` |
| `BA/services/fiscalAttest/pdf.ts:29, 81, 86` | Attest PDF, payer and child | `formatNationalNumber` from `BA/lib/nationalNumber.ts:29-33` |
| `BA/services/fiscalAttest/belcotax/xml.ts:151, 188` | Belcotax XML | Digits (correct, must stay digits) |
| `BA/pages/admin/fiscalAttests/FiscalAttests.tsx:152-154` | Payer label | Number not shown (name + %) |
| `core/modules/oms/pages/admin/orderEdit/Items.tsx:15-21, 172-178` | Admin order registrations | Number not shown (names only) |
| Participant grid, registration grid, `participantEdit/Registrations.tsx` | | Number not shown, no export |

### Validation and normalization (backend)

| Where (file:line) | What | Normalizes to digits? |
|---|---|---|
| `BA/lib/nationalNumber.ts:14-22` | `isValidNationalNumber`: 11 digits, checksum `97 - (first9 mod 97)`, or the same on `2000000000 + first9` for people born from 2000. Strips non-digits first, so any formatting passes | n/a |
| `BA/lib/nationalNumber.ts:29-33` | `formatNationalNumber` -> `85.07.30-033.28` | n/a |
| `BA/bootstrap.ts:12-22` | `participantDataBeforeCreate/Update`: admin participant | **No** (stored as typed) |
| `BA/bootstrap.ts:53-70` | `participantCheckoutExtraData`: checkout fields | Yes |
| `BA/api/addCartAddress/[escapeHtml]savePayerNationalNumber[saveAddress].ts:20-21` | Payer at checkout | Yes |
| `BA/api/saveCustomerNationalNumber/saveCustomerNationalNumber.ts:9-10` | Admin customer | Yes |
| `BA/api/saveFiscalData/saveFiscalData.ts:19-21, 41-48, 64-76` | Account fiscal data | Yes |
| `BA/services/fiscalAttest/payers.ts:244-246` | Other parent (account) | Yes |
| `BA/services/fiscalAttest/generateFiscalAttests.ts:217-219, 236` | Admin payers | Yes |
| `BA/services/fiscalAttest/buildAttests.ts:271, 305` | Attest issues `invalid_child/payer_national_number` | n/a |
| `content/plugins/woocommerce-import/src/lib/customerNationalNumber.ts:16-25` | **Second copy** of the checksum | n/a |

### Form infrastructure

- Form lib is the in-house EverShop one, not react-hook-form: `includes/components/form/Form.tsx`
  keeps a list of fields (`addField/updateField`, `:73-93`), runs `validate()` **only on submit**
  (`:95-132`), and posts the DOM `FormData` (`:142-151`). The last failing rule's message wins
  (`:108-113`).
- `Field` (`includes/components/form/Field.tsx:90-185`) keeps its own `fieldValue` state and only
  resyncs from the `value` prop when that prop changes (`:111-117`). A mask that rewrites the
  value while typing does not fit this well (typing a non-digit leaves `value` unchanged, so the
  raw character stays visible).
- Rules are global by key: `validator.addRule(key, handler, message)` (`includes/components/form/validator.js:44-49`).
- `Input` renders label, `prefix/suffix`, `instruction` and `Error` (`includes/components/form/fields/Input.tsx:50-67`).
- No mask or validation library in `package.json` (no imask, cleave, zod, yup, react-hook-form).
- Plugin frontend code imports core components through `@components/*` and core libs through
  `@evercamps/evercamps/lib/*` (`content/plugins/belgian-administration/tsconfig.json:23-38`).
  Plugin backend code imports compiled core from `dist` through `BA/core.ts`.
- Translations: `_()` reads `content/translations/<shop.language>/*.csv`
  (`includes/lib/webpack/loaders/loadTranslationFromCsv.ts:12-40`). There are **no** national
  number strings in `content/translations/nl` yet, and the admin components (#6, #9) use hard-coded
  English.
- Checkout field types: `'text' | 'date' | 'select'` (`core/modules/camp/services/participantCheckoutFields.ts:26, 34`,
  `includes/types/checkout.ts:43`, `core/modules/camp/pages/admin/campSetting/CampSetting.tsx:13, 19`,
  `General.tsx:10`). The type is copied from the available definition into the saved setting
  (`CampSetting.tsx:116`), and the plugin defines both national number fields as `type: 'text'`
  (`BA/bootstrap.ts:41-42`).

## Design

### 1. Shared util: `includes/lib/util/nationalNumber.ts`

Pure, no dependencies, used by the browser and the server. Replaces `BA/lib/nationalNumber.ts`
(which becomes a re-export) and the woocommerce-import copy.

```ts
export type NationalNumberError =
  | 'empty'
  | 'incomplete'      // fewer than 11 digits
  | 'too_long'        // more than 11 digits
  | 'checksum';       // 11 digits, checksum does not match either century

export interface NationalNumberInfo {
  digits: string;                 // 11 digits
  century: 1900 | 2000;           // which checksum formula matched
  birthDate: string | null;       // 'YYYY-MM-DD', null for 00 month/day or BIS numbers
  bis: boolean;                   // month + 20 / + 40 (BIS number)
  sex: 'M' | 'F';                 // sequence odd = M, even = F (info only, not shown)
}

export function normalizeNationalNumber(raw: unknown): string;               // digits only
export function maskNationalNumber(raw: unknown): string;                    // progressive: '8507' -> '85.07'
export function formatNationalNumber(raw: unknown): string;                  // 11 digits -> '85.07.30-033.28', else unchanged
export function checkNationalNumber(raw: unknown):
  { ok: true; info: NationalNumberInfo } | { ok: false; error: NationalNumberError; digits: string };
export function isValidNationalNumber(raw: unknown): boolean;                // kept, same behavior as today
export function matchesBirthDate(raw: unknown, birthDate: string): boolean;  // YYMMDD + century vs date
```

Rules (same as today, made explicit):

- Strip everything that is not a digit before checking.
- Checksum: `97 - (first9 mod 97)` (97 when the remainder is 0). If it fails, retry with
  `2000000000 + first9` (born in 2000 or later). The matching formula gives the century.
- Do **not** reject month > 12 or day 00: BIS numbers (month + 20 or + 40) and unknown birth dates
  (`00`) are valid. `birthDate` is then `null`.
- `matchesBirthDate` compares YYMMDD **and** the century with a known birth date. Skipped when
  `birthDate` is `null` (BIS / unknown).

### 2. Component: `includes/components/form/fields/NationalNumberInput.tsx`

One component for all inputs in the inventory, inside or outside a `<Form>`.

```ts
interface NationalNumberInputProps {
  name: string;                         // posted field name, e.g. 'national_number'
  label?: string;
  value?: string | null;                // digits or formatted; shown masked
  onChange?: (digits: string) => void;  // always digits (for state-based screens #2, #6-#9)
  required?: boolean;
  disabled?: boolean;
  notApplicable?: {                     // renders the checkbox; when ticked: input disabled, value cleared, no validation
    name?: string;                      // posted checkbox name, e.g. 'national_number_not_applicable'
    label: string;
    checked?: boolean;
    onChange?: (checked: boolean) => void;
  };
  birthDate?: string | null;            // optional cross-check (warning only)
  instruction?: string;
  id?: string;
}
```

Behavior:

- **Mask `YY.MM.DD-XXX.CC`.** Own visible `<input inputMode="numeric" autoComplete="off" maxLength={15}>`
  without a `name`. On every change: strip to digits (max 11), re-apply `maskNationalNumber`, and
  put the caret back after the same number of digits (count digits left of the caret before and
  after). Separators are inserted as soon as the next digit is typed, so backspace never gets stuck
  on a dot. Paste of `85073003328`, `85.07.30-033.28` or `85 07 30 033 28` all give the same result.
  Placeholder `YY.MM.DD-XXX.CC` (today `YY.MM.DD-XXX.XX` everywhere).
- **Stored value is digits.** A `<input type="hidden" name={name} value={digits}>` is what the
  form posts. The backend keeps normalizing too (never trust the client).
- **Form integration.** When inside a `Form` (`useFormContext()` is defined), the component calls
  `addField(name, digits, rules)` on mount and `updateField` on change, like `Field` does
  (`Field.tsx:103-117`), so `Form.validate` runs on submit and focuses the field
  (`Form.tsx:181-185`). Rules: `[]` when not applicable, else `['nationalNumber']` plus
  `'notEmpty'` first when `required`. One global rule `nationalNumber` is registered once at module
  load (`validator.addRule`); its handler returns `true` for empty values, so `required` stays a
  separate concern. This replaces the per-component rules `nationalNumber` and
  `payerNationalNumber` and the `skipRef` trick (`NationalNumberField.tsx:22-35`,
  `PayerNationalNumber.tsx:31-42`).
- **Live feedback** (outside of submit), rendered with the existing `Error` component and a
  `suffix` icon:

  | State | When shown | Message (en) |
  |---|---|---|
  | typing, < 11 digits | nothing while focused; on blur | "A national number has 11 digits. You entered {n}." |
  | 11 digits, bad checksum | immediately | "This national number is not correct. Check for a typo." |
  | valid | immediately | green check icon in the suffix, no text |
  | valid but birth date differs | immediately, as a warning (not blocking) | "This number does not match the date of birth ({date})." |
  | required and empty | on blur and on submit | "Enter a national number, or tick \"{notApplicableLabel}\"." (or the plain notEmpty text when there is no checkbox) |

  On submit the Form error (if any) wins over the live message, so there is one message at a time.
- **Not applicable.** Only rendered when the `notApplicable` prop is given. Ticking it disables the
  input, clears the error and posts `notApplicable.name = 1`. The digits are kept in state so
  unticking restores them, but they are not posted while ticked (hidden input value `''`).
- **Accessibility.** `aria-invalid`, `aria-describedby` pointing to the message, label `htmlFor`.

### 3. Display formatter

`formatNationalNumber` from the util is the only formatter. Read-only places call it; empty values
show "-" or "Not filled in" as today. The Belcotax XML keeps digits.

### 4. Where it lives: core, with a field type

Options considered:

| Option | How generic checkout fields render it | Verdict |
|---|---|---|
| **A. Core component + `national_number` field type** | Core renderers switch on `field.type`; plugin declares `type: 'national_number'` | **Recommended.** One component, no runtime registry, plugin screens import it via `@components/form/fields/NationalNumberInput` |
| B. Plugin component + renderer registry (core renders an `Area` per field type, plugin fills it) | Needs a client-side registry or one Area per field in three forms; Area has no "replace" semantics | Too much machinery for one field type |
| C. Plugin component, core keeps text fields | Generic flows (#1-#3) never get the mask | Does not meet the requirement |

With A, core knows the Belgian format, but only as an input type. It is harmless when the
belgian-administration plugin is off (no field declares the type). The checksum rules stay in one
place (`includes/lib/util`), and the plugin backend imports them from `dist` through `BA/core.ts`.

To avoid touching every saved setting, the **type is taken from the available definition** at read
time: the `Setting.participantCheckoutFields` resolver
(`core/modules/camp/graphql/types/CampSetting/CampSetting.resolvers.ts:9-10`) parses the JSON and
overwrites `type` with the current definition's type (by `code`). All renderers read the setting
through this resolver (`Form.tsx:432`, `ShoppingCart.tsx:144`, `General.tsx:111`), so existing
configs pick up the new type without a migration.

## Implementation steps

### Step 0 - prerequisites from the 0.0.2 plan

Do steps 1-3, 5 and 6 of `plan-duplicate-checkout-fields.md`: one national number input on the
admin participant page (plugin-owned), remove `payer_national_number` from the selectable checkout
fields, normalize the admin value in `BA/bootstrap.ts:12-22`. Without this, the component would
just render twice on the admin page.

### Step 1 - shared util

1. Add `includes/lib/util/nationalNumber.ts` (design 1).
2. `BA/lib/nationalNumber.ts`: keep `isTruthyFlag`, re-export the rest. Frontend files import
   `@evercamps/evercamps/lib/util/nationalNumber`; backend files import from `BA/core.ts`, which
   adds `export * from '../../../../dist/lib/util/nationalNumber.js'`.
3. `content/plugins/woocommerce-import/src/lib/customerNationalNumber.ts:14-25`: replace the copy
   with an import through `content/plugins/woocommerce-import/src/core.ts`.
4. Backend callers use `normalizeNationalNumber` instead of `.replace(/\D/g, '')`:
   `BA/bootstrap.ts:12-22, 67`, `savePayerNationalNumber[saveAddress].ts:20`,
   `saveCustomerNationalNumber.ts:9`, `saveFiscalData.ts:19-21`, `payers.ts:244`,
   `generateFiscalAttests.ts:217, 236`, `buildAttests.ts:162`.
5. Backend error messages use the same wording as the frontend (one source in the util:
   `nationalNumberErrorMessage(error)` returning the English key, translated with `_()` on the
   frontend).

### Step 2 - component

1. Add `includes/components/form/fields/NationalNumberInput.tsx` (design 2) and register the
   `nationalNumber` rule there.
2. Add styles to `includes/components/form/Field.scss` only if needed (suffix check icon,
   warning color). Reuse `form-field-container`, `field-wrapper`, `field-suffix`.
3. Optional: `Field.tsx` accepts `type="nationalNumber"` and delegates to the component, so Area
   `coreComponents` built from config (like `General.tsx`) can use it without a special case.

### Step 3 - field type `national_number`

1. Add `'national_number'` to the type unions: `core/modules/camp/services/participantCheckoutFields.ts:26, 34`,
   `includes/types/checkout.ts:43`, `core/modules/camp/pages/admin/campSetting/CampSetting.tsx:13, 19`,
   `core/modules/camp/pages/admin/participantEdit+participantNew/General.tsx:10`.
2. `BA/bootstrap.ts:41`: `type: 'national_number'`, placeholder `YY.MM.DD-XXX.CC`.
3. `CampSetting.resolvers.ts:9-10`: overlay `type` from `getAvailableParticipantCheckoutFields()`
   (design 4). Also drop codes that are no longer available (covers 0.0.2 step 7 on read).

### Step 4 - use the component everywhere

| # | File | Change |
|---|---|---|
| 1 | `core/modules/catalog/pages/frontStore/productView/ParticipantForm.tsx:127-142` | `field.type === 'national_number'` -> `NationalNumberInput name={field.code} required={field.required} onChange={(d) => setExtraValues(...)}`. If a `birth_date` field is configured too, pass its value as `birthDate` |
| 2 | `core/components/frontStore/checkout/cart/items/EditParticipantForm.tsx:71-87` | Same switch; `onChange` writes digits into `extraData` |
| 2b | `core/components/frontStore/checkout/cart/items/Items.tsx:236-240` | Run the form validation before `updateRegistration` (use `useFormDispatch().validate()` in `EditParticipantForm`, or submit through the `Form`), and only close the modal when the API call succeeds. Today invalid values only fail server-side and the modal closes anyway |
| 3 | `core/modules/camp/pages/admin/participantEdit+participantNew/General.tsx:68-80` | After step 0 the national number is no longer rendered here. Still add the type switch, so a future column-backed field of this type renders correctly |
| 4 | `BA/pages/admin/participantEdit+participantNew/NationalNumberField.tsx:39-55` | Replace both `Field`s with `NationalNumberInput name="national_number" required notApplicable={{ name: 'national_number_not_applicable', ... }}`. Query `birthDate` too (`:65-72`) for the cross-check. Remove the local rule (`:22-35`) |
| 5 | `BA/pages/frontStore/checkout/PayerNationalNumber.tsx:54-70` | `NationalNumberInput name="payer_national_number" required notApplicable={{ name: 'payer_national_number_not_applicable', label: _('I am not a Belgian national') }}`. Remove local `format()` (`:23-28`) and rule (`:31-42`) |
| 6 | `BA/pages/admin/customerEdit/CustomerNationalNumber.tsx:166-173` | `NationalNumberInput` outside a Form with `onChange`; keep "Save disabled when invalid" using `checkNationalNumber`. Use `formatNationalNumber` for the read-only line (`:151`). Remove local `format()` (`:15-20`) |
| 7 | `BA/pages/frontStore/account/FiscalData.tsx:94-101, 111-136` | Own number: `NationalNumberInput`. Children: `NationalNumberInput` with `notApplicable` (replaces the custom checkbox `:125-136`); add `birthDate` to the participants query (`:157-163`) for the cross-check. Remove local `format()` (`:27-32`) |
| 8 | `BA/pages/frontStore/account/FiscalAttestPayers.tsx:151, 155-159` | Render `NationalNumberInput` instead of `field('nationalNumber', ...)`; drop the separate error line (`:155-159`), keep `nnInvalid` for the Save button |
| 9 | `BA/pages/admin/fiscalAttests/FiscalAttests.tsx:523-528` | Compact `NationalNumberInput` (no label, placeholder). Adds the missing frontend check |

Read-only places:

- `core/components/frontStore/checkout/cart/items/Items.tsx:140-145`: format values of
  `type === 'national_number'` with `formatNationalNumber`.
- `CustomerNationalNumber.tsx:151`, `pdf.ts:29`: switch to the shared formatter.
- Not added: national numbers on admin order view, grids or exports. They are GDPR special
  identifiers (`BA/graphql/types/Participant/Participant.resolvers.ts:1-4`); showing them in more
  places is a separate decision (see open questions).

### Step 5 - data cleanup

Plugin migration `BA/migration/Version-1.7.0.ts` (next after `Version-1.6.0.ts`): normalize
existing values that were stored with formatting by the admin flow (0.0.2 plan, cleanup 1):

```sql
UPDATE participant SET national_number = regexp_replace(national_number, '\D', '', 'g')
WHERE national_number ~ '\D';
```

Same for `customer.national_number`, `cart.payer_national_number`,
`order_item_registration.payer_national_number`, `fiscal_attest_payer.national_number` (all are
already normalized on write, so this should be a no-op; run the `SELECT count(*)` first).

### Step 6 - translations

Add to `content/translations/nl/` (new `nationalnumber.csv`, or `general.csv` + `account.csv`), and
`fr` if the shop runs in French. Note the CSV format is `key, value` split on comma, so messages
with commas must be avoided or quoted (check `includes/lib/util/readCsvFile.ts`).

| en | nl |
|---|---|
| National number | Rijksregisternummer |
| A national number has 11 digits. You entered {n}. | Een rijksregisternummer heeft 11 cijfers. Je gaf er {n} in. |
| This national number is not correct. Check for a typo. | Dit rijksregisternummer klopt niet. Controleer op een tikfout. |
| This number does not match the date of birth ({date}). | Dit nummer past niet bij de geboortedatum ({date}). |
| Not applicable (not a Belgian national) | Niet van toepassing (geen Belgische nationaliteit) |
| I am not a Belgian national | Ik heb geen Belgische nationaliteit |

Admin components #6 and #9 use hard-coded English today; wrap them in `_()` while touching them.

### Step 7 - tests

- **Util unit tests** (`includes/lib/util/tests/unit/nationalNumber.test.ts`):
  - valid, born before 2000: `85073003328` -> `century 1900`, `birthDate 1985-07-30`
  - valid, born from 2000: `16050100178` -> `century 2000`, `birthDate 2016-05-01`
  - bad checksum: `85073003329` -> `checksum`
  - formatted input `85.07.30-033.28` and `85 07 30 033 28` -> same digits
  - 10 digits -> `incomplete`; 12 digits -> `too_long`; `''` -> `empty`
  - BIS number (month + 20) and `00` month/day: valid, `birthDate null`
  - `maskNationalNumber`: `''`, `8`, `85`, `850`, `8507`, ..., 11 digits, and a 12th digit is ignored
  - `matchesBirthDate`: same date, other date, same YYMMDD but other century
  - Note: root `jest.config.js:27` only matches `**/src/**/tests/**/unit/**`, which existing
    `includes/lib/*/tests/unit` tests do not match. Verify they run; otherwise widen `testMatch`, or
    put the test in the plugin (`node --test dist/`, like `BA/services/fiscalAttest/pdf.test.ts`).
- **Plugin tests**: `validateCheckoutNationalNumbers` and `validateNationalNumber` normalize and
  reject (node:test, next to `bootstrap.ts`).
- **Manual test** (each screen in the inventory):
  1. Type `85073003328`: shows `85.07.30-033.28`, green check. Posted / stored as digits.
  2. Paste `85.07.30-033.28`: same result. Backspace through the dots works; caret stays in place
     when editing in the middle.
  3. Change the last digit: "not correct" message right away. Submit is blocked, focus goes to the field.
  4. Type 8 digits and leave the field: "11 digits" message.
  5. Tick "Not applicable": input disabled, message gone, save works, flag stored.
  6. Participant with birth date 2016-05-01 and number `85073003328`: warning, save still works.
  7. Cart: edit a participant with an invalid number: the modal stays open with the error.
  8. Cart summary shows the formatted number.
  9. Plugin disabled: product page and cart render without errors; no national number field.
  10. Existing setting with `type: 'text'` for `national_number`: the masked input is used anyway
      (resolver overlay).

## Open questions

1. **"Not applicable" at checkout.** The generic checkout field has no "not applicable" option, so a
   required `national_number` blocks non-Belgian children. Add it there too? Recommendation: yes,
   only when the field is required; post `national_number_not_applicable=1` in `extra_data`, let
   `collectParticipantExtraData` (`core/modules/camp/services/participantCheckoutFields.ts:88-98`)
   accept it as filled, and let `fillEmptyParticipantFields`
   (`core/modules/checkout/services/orderCreator.ts:132-166`) copy it to the participant column.
   This needs a generic "companion flag" for a field type in core; decide before implementing.
2. **Birth date mismatch: warning or error?** Recommendation: warning. Parents mistype birth dates
   too, and BIS numbers have no date.
3. **Mask library or own code?** Recommendation: own code (about 40 lines, one fixed pattern).
   `react-imask` would be the choice if more masked inputs (IBAN, KBO number in `BA/lib/companyNumber.ts`)
   follow.
4. **Generic masked input.** Should the component be built on a small `MaskedInput` (pattern +
   validator) so the KBO/company number and IBAN can reuse it? Not needed for this item; keep the
   API open for it.
5. **More read-only places.** Should admins see the child's national number on the order view or
   in the registration grid / an export? Not today; keep it to the participant and customer pages
   unless asked (GDPR).
6. **Core vs plugin.** Is it acceptable that the Belgian checksum lives in `includes/lib/util`? If
   not, keep the util in the plugin and only put a generic `type`-based renderer slot in core
   (option B), at the cost of more code.
