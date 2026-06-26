# Configurable Participant Uniqueness Fields

## Background

Participants are currently deduplicated by `first_name + last_name` only. Two registrations with the same name are automatically merged into one participant record. This is intentional for the common case (returning camper), but causes false merges for different people who share a name (e.g., two unrelated "John Smith" campers).

The solution is a configurable system: a store admin can enable extra fields to collect during checkout (starting with `birth_date`). Any field marked `useForUniqueness` is included in the participant lookup query, so same-name participants with different birthdays are treated as distinct people.

**Storage strategy — split by table purpose:**
- `participant` table: one typed DB column per supported field (`birth_date DATE`, etc.) — clean SQL, easy indexing, used in the uniqueness query.
- `cart_item_registration` and `order_item_registration`: a single `extra_data JSON` column — these tables are data carriers; nobody queries individual fields on them. JSON storage avoids a new migration in both tables every time a new field type is added.

---

## Step 1 — Admin setting: define extra participant fields

**What:** Add a store setting `participant_checkout_fields` (stored as JSON in the `setting` table, `is_json = 1`) that holds an ordered array of field config objects.

**Shape:**
```json
[
  {
    "code": "birth_date",
    "label": "Date of Birth",
    "type": "date",
    "required": false,
    "useForUniqueness": true
  }
]
```

| Property | Purpose |
|---|---|
| `code` | Maps to the typed column on `participant` and to the key in `extra_data` on checkout tables |
| `label` | Human-readable label shown in the checkout form |
| `type` | `"text"`, `"date"`, or `"select"` — drives the input type rendered |
| `required` | Whether the field must be filled before adding to cart |
| `useForUniqueness` | Whether the field is included in the participant uniqueness query |

**`code` is restricted to an allowlist** of columns that actually exist on the `participant` table. Adding a new supported field requires a developer to (1) add a DB column to `participant` and (2) add the entry to the allowlist constant — the admin UI then makes it selectable.

```typescript
// packages/evercamps/src/modules/setting/pages/admin/storeSetting/StoreSetting.tsx
const AVAILABLE_PARTICIPANT_FIELDS = [
  { code: 'birth_date', label: 'Date of Birth', type: 'date' },
  // future: { code: 'gender', label: 'Gender', type: 'select' },
] as const;
```

The `code` input in the admin UI is a **dropdown** populated from this list, not a free-text field.

**Files to touch:**
- **Backend read:** `packages/evercamps/src/modules/setting/services/setting.ts` — use `getSetting('participant_checkout_fields', [])` wherever the list is needed.
- **Admin save:** `packages/evercamps/src/modules/setting/api/saveSetting/saveSetting.ts` — already handles JSON values generically; no changes needed.
- **Admin UI:** `packages/evercamps/src/modules/setting/pages/admin/storeSetting/StoreSetting.tsx` — add a new section with a table/list to add, remove, and configure extra field entries. Each row has a `code` dropdown (from `AVAILABLE_PARTICIPANT_FIELDS`), a `label` text input, and toggles for `required` and `useForUniqueness`.

---

## Step 2 — DB migrations

### 2a. Camp module — `participant` table (typed column)

**New file:** `packages/evercamps/src/modules/camp/migration/Version-1.0.2.ts`

```sql
ALTER TABLE participant ADD COLUMN birth_date DATE NULL;
```

Repeat this pattern (one migration, one column on `participant`) for each new field type added in the future.

### 2b. Checkout module — `cart_item_registration` table (one-time JSON column)

**New file:** `packages/evercamps/src/modules/checkout/migration/Version-1.0.8.js`

```sql
ALTER TABLE cart_item_registration ADD COLUMN extra_data JSON NULL;
```

This is a **one-time migration**. All future extra fields are stored inside this JSON column — no further migrations needed on this table.

### 2c. OMS module — `order_item_registration` table (one-time JSON column)

**New file:** `packages/evercamps/src/modules/oms/migration/Version-1.0.4.js`

```sql
ALTER TABLE order_item_registration ADD COLUMN extra_data JSON NULL;
```

Same as 2b — one migration, never touched again when new fields are added.

---

## Step 3 — Expose the setting via GraphQL

The checkout frontend needs to read the configured fields at render time.

**Files to touch:**
- `packages/evercamps/src/modules/setting/graphql/types/StoreSetting/StoreSetting.graphql` — add:
  ```graphql
  participantCheckoutFields: String
  ```
  (Return as a JSON string; the client parses it. Alternatively, define a proper `ParticipantCheckoutField` GraphQL type for stronger typing.)

- `packages/evercamps/src/modules/setting/graphql/types/StoreSetting/StoreSetting.resolvers.ts` — add a resolver that calls `getSetting('participant_checkout_fields', [])` and returns the value (JSON-stringified if using the `String` type approach).

---

## Step 4 — Dynamic fields in `ParticipantForm.jsx`

The form shown when adding a product to the cart needs to render extra inputs driven by the setting.

**File:** `packages/evercamps/src/modules/catalog/pages/frontStore/productView/ParticipantForm.jsx`

Changes:
1. Accept a new prop `extraFields` (the parsed array from the setting; defaults to `[]`).
2. Add a `const [extraValues, setExtraValues] = useState({})` for the extra field state.
3. After the existing last name input, map over `extraFields` and render one `<Field>` (or `<input>`) per entry, using `field.label`, `field.type`, and `field.required`.
4. Include `extraValues` in the `onSubmit` call alongside `firstName` / `lastName`.

**Parent component:** `packages/evercamps/src/modules/catalog/pages/frontStore/productView/Form.jsx`

- Query `participantCheckoutFields` from the `StoreSetting` GraphQL query.
- Parse the JSON and pass the array as `extraFields` to `<ParticipantForm>`.

---

## Step 5 — Dynamic fields in `EditParticipantForm.tsx`

The form used to edit a registration already in the cart follows the same pattern.

**File:** `packages/evercamps/src/components/frontStore/checkout/cart/items/EditParticipantForm.tsx`

Changes (mirror Step 4):
1. Accept `extraFields` prop and initial `extraValues` (pre-filled from the cart registration's `extraData`).
2. Render dynamic inputs below first/last name.
3. Include `extraValues` in the update payload sent to the API.

The parent cart item component must also query `participantCheckoutFields` and forward both the config (`extraFields`) and the stored values (`registration.extraData`) to the form.

---

## Step 6 — Cart API: accept extra field values

**File:** `packages/evercamps/src/modules/checkout/api/updateCartItemRegistration/[bodyParser]updateRegistration.js`

The request body currently expects only `{ firstName, lastName }`. Extend it to also accept an `extraData` object (e.g., `{ firstName, lastName, extraData: { birth_date: '2010-05-14' } }`). Pass the full extended object down into `saveCart`.

---

## Step 7 — Cart persistence: write extra fields to `cart_item_registration`

**File:** `packages/evercamps/src/modules/checkout/services/saveCart.ts`

When building the INSERT or UPDATE for a `cart_item_registration` row, write the entire `extraData` object into the `extra_data` JSON column:

```typescript
const extraData = registration.extraData ?? {};
// include extra_data in the insert/update payload
{ ..., extra_data: JSON.stringify(extraData) }
```

No need to read the setting here — whatever the client collected is stored as-is.

---

## Step 8 — Cart loading: read extra fields from `cart_item_registration`

**File:** `packages/evercamps/src/modules/checkout/services/cart/Cart.js`

Where registrations are grouped by `cart_item_id` and mapped to objects, parse and include `extra_data`:

```javascript
{
  cartItemRegistrationId: r.cart_item_registration_id,
  cartItemId: r.cart_item_id,
  firstName: r.first_name,
  lastName: r.last_name,
  extraData: r.extra_data ? JSON.parse(r.extra_data) : {}
}
```

No field-specific code needed — `extraData` is passed through opaquely until order creation.

---

## Step 9 — Order creation: use configured fields for the uniqueness check

**File:** `packages/evercamps/src/modules/checkout/services/orderCreator.ts`

Current participant lookup (around lines 123–127):
```typescript
const participant = await select()
  .from('participant')
  .where('first_name', '=', reg.firstName)
  .and('last_name', '=', reg.lastName)
  .load(connection);
```

Updated logic:
1. Call `getSetting('participant_checkout_fields', [])`.
2. Filter fields where `useForUniqueness === true`.
3. For each such field, chain `.andWhere(field.code, '=', reg.extraData?.[field.code] ?? null)`.

When **creating** a new participant, spread the `useForUniqueness` field values from `extraData` into the INSERT as proper typed columns:

```typescript
const extraInsert = Object.fromEntries(
  uniquenessFields.map((f) => [f.code, reg.extraData?.[f.code] ?? null])
);
// merge extraInsert into the participant INSERT payload
```

When writing to `order_item_registration`, store the entire `extraData` as `extra_data JSON`:

```typescript
{ ..., extra_data: JSON.stringify(reg.extraData ?? {}) }
```

---

## Step 10 — Participant service: update uniqueness check and schema

### 10a. Uniqueness check

**File:** `packages/evercamps/src/modules/camp/services/participant/createParticipant.ts`

Same change as Step 9: read `participant_checkout_fields`, filter by `useForUniqueness`, and extend the SELECT that checks for an existing participant using the typed columns on `participant`.

### 10b. JSON Schema

**File:** `packages/evercamps/src/modules/camp/services/participant/participantDataSchema.json`

Add `birth_date` as an optional property so AJV validates its format when present:

```json
{
  "type": "object",
  "properties": {
    "first_name": { "type": "string" },
    "last_name":  { "type": "string" },
    "birth_date": { "type": "string", "format": "date" }
  },
  "required": ["first_name", "last_name"],
  "additionalProperties": true
}
```

The existing `additionalProperties: true` already lets the value pass through; the explicit property definition adds format validation.

---

## Files changed (summary)

| Area | File |
|---|---|
| DB – camp (`participant` typed column) | `modules/camp/migration/Version-1.0.2.ts` *(new)* |
| DB – checkout (`extra_data` JSON, one-time) | `modules/checkout/migration/Version-1.0.8.js` *(new)* |
| DB – OMS (`extra_data` JSON, one-time) | `modules/oms/migration/Version-1.0.4.js` *(new)* |
| Participant JSON schema | `modules/camp/services/participant/participantDataSchema.json` |
| Participant create service | `modules/camp/services/participant/createParticipant.ts` |
| Order creation | `modules/checkout/services/orderCreator.ts` |
| Cart save | `modules/checkout/services/saveCart.ts` |
| Cart load | `modules/checkout/services/cart/Cart.js` |
| Cart update API | `modules/checkout/api/updateCartItemRegistration/[bodyParser]updateRegistration.js` |
| GraphQL setting schema | `modules/setting/graphql/types/StoreSetting/StoreSetting.graphql` |
| GraphQL setting resolver | `modules/setting/graphql/types/StoreSetting/StoreSetting.resolvers.ts` |
| Admin UI | `modules/setting/pages/admin/storeSetting/StoreSetting.tsx` |
| Checkout add-to-cart form | `modules/catalog/pages/frontStore/productView/ParticipantForm.jsx` + `Form.jsx` |
| Cart edit form | `components/frontStore/checkout/cart/items/EditParticipantForm.tsx` |

---

## Verification checklist

1. **Admin config**: Set `participant_checkout_fields` to include a `birth_date` entry (selectable from the dropdown). Save and reload — confirm the value persists and is returned by GraphQL.
2. **Checkout form**: Navigate to a product with `manageRegistrations = true`. The participant modal should now show a "Date of Birth" input below last name.
3. **Merge case**: Add two registrations with the same first + last name *and* the same birth date. After checkout, only one `participant` row should exist.
4. **No-merge case**: Same first + last name but *different* birth dates. After checkout, two distinct `participant` rows should exist.
5. **Cart edit**: Open an existing registration in the cart — the birth date should be pre-filled from `cart_item_registration.extra_data`.
6. **Order record**: Complete a checkout and inspect `order_item_registration.extra_data` (JSON) and `participant.birth_date` (typed column) — both should be populated correctly.
