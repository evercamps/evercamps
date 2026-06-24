# Configurable Participant Uniqueness Fields

## Background

Participants are currently deduplicated by `first_name + last_name` only. Two registrations with the same name are automatically merged into one participant record. This is intentional for the common case (returning camper), but causes false merges for different people who share a name (e.g., two unrelated "John Smith" campers).

The solution is a configurable system: a store admin can define extra fields to collect during checkout (starting with `birth_date`). Any field marked `useForUniqueness` is included in the participant lookup query, so same-name participants with different birthdays are treated as distinct people.

Storage strategy: **one DB column per field type** — clean SQL, easy indexing, no JSON extraction overhead.

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
| `code` | Maps to the DB column name and the form field key |
| `label` | Human-readable label shown in the checkout form |
| `type` | `"text"`, `"date"`, or `"select"` — drives the input type rendered |
| `required` | Whether the field must be filled before adding to cart |
| `useForUniqueness` | Whether the field is included in the participant uniqueness query |

**Files to touch:**
- **Backend read:** `packages/evercamps/src/modules/setting/services/setting.ts` — use `getSetting('participant_checkout_fields', [])` wherever the list is needed.
- **Admin save:** `packages/evercamps/src/modules/setting/api/saveSetting/saveSetting.ts` — already handles JSON values generically; no changes needed.
- **Admin UI:** `packages/evercamps/src/modules/setting/pages/admin/storeSetting/StoreSetting.tsx` — add a new section with a table/list to add, remove, and configure extra field entries. Each row needs inputs for `code`, `label`, `type`, toggles for `required` and `useForUniqueness`.

---

## Step 2 — DB migrations: add `birth_date` column

Three tables store participant name data at different points in the flow and all need the extra column(s).

### 2a. Camp module — `participant` table

**New file:** `packages/evercamps/src/modules/camp/migration/Version-1.0.2.ts`

```sql
ALTER TABLE participant ADD COLUMN birth_date DATE NULL;
```

### 2b. Checkout module — `cart_item_registration` table

**New file:** `packages/evercamps/src/modules/checkout/migration/Version-1.0.8.js`

```sql
ALTER TABLE cart_item_registration ADD COLUMN birth_date DATE NULL;
```

### 2c. OMS module — `order_item_registration` table

**New file:** `packages/evercamps/src/modules/oms/migration/Version-X.js` (use the next version number)

```sql
ALTER TABLE order_item_registration ADD COLUMN birth_date DATE NULL;
```

> **Future fields:** For each new field type added to the config, repeat this pattern — one migration per module per field.

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
1. Accept `extraFields` prop and initial `extraValues` (pre-filled from the cart registration).
2. Render dynamic inputs below first/last name.
3. Include `extraValues` in the update payload sent to the API.

The parent cart item component must also query `participantCheckoutFields` and forward both the config (`extraFields`) and the stored values (`registration.extraValues`) to the form.

---

## Step 6 — Cart API: accept extra field values

**File:** `packages/evercamps/src/modules/checkout/api/updateCartItemRegistration/[bodyParser]updateRegistration.js`

The request body currently expects only `{ firstName, lastName }`. Extend it to also forward any extra field values (e.g., `{ firstName, lastName, birth_date: '2010-05-14' }`). Pass the full extended object down into `saveCart`.

---

## Step 7 — Cart persistence: write extra fields to `cart_item_registration`

**File:** `packages/evercamps/src/modules/checkout/services/saveCart.ts`

When building the INSERT or UPDATE for a `cart_item_registration` row, read `getSetting('participant_checkout_fields', [])` and include each field's `code` as a column if a value is present on the registration object.

```typescript
const extraFields = await getSetting('participant_checkout_fields', []);
const extraData = Object.fromEntries(
  extraFields.map((f) => [f.code, registration[f.code] ?? null])
);
// merge extraData into the insert/update payload
```

---

## Step 8 — Cart loading: read extra fields from `cart_item_registration`

**File:** `packages/evercamps/src/modules/checkout/services/cart/Cart.js`

Where registrations are grouped by `cart_item_id` and mapped to objects, also include the extra field columns:

```javascript
{
  cartItemRegistrationId: r.cart_item_registration_id,
  cartItemId: r.cart_item_id,
  firstName: r.first_name,
  lastName: r.last_name,
  birth_date: r.birth_date   // add for each configured field
}
```

To avoid hard-coding, read the configured fields from the setting and dynamically add them to the mapped object.

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
3. Chain `.andWhere(field.code, '=', reg[field.code])` for each such field.

Also:
- When creating a new participant, include the extra field values in the INSERT.
- When writing to `order_item_registration`, include the extra field columns.

---

## Step 10 — Participant service: update uniqueness check and schema

### 10a. Uniqueness check

**File:** `packages/evercamps/src/modules/camp/services/participant/createParticipant.ts`

Same change as Step 9: read `participant_checkout_fields`, filter by `useForUniqueness`, and extend the SELECT that checks for an existing participant.

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
| DB – camp | `modules/camp/migration/Version-1.0.2.ts` *(new)* |
| DB – checkout | `modules/checkout/migration/Version-1.0.8.js` *(new)* |
| DB – OMS | `modules/oms/migration/Version-X.js` *(new)* |
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

1. **Admin config**: Set `participant_checkout_fields` to include a `birth_date` entry. Save and reload — confirm the value persists and is returned by GraphQL.
2. **Checkout form**: Navigate to a product with `manageRegistrations = true`. The participant modal should now show a "Date of Birth" input below last name.
3. **Merge case**: Add two registrations with the same first + last name *and* the same birth date. After checkout, only one `participant` row should exist.
4. **No-merge case**: Same first + last name but *different* birth dates. After checkout, two distinct `participant` rows should exist.
5. **Cart edit**: Open an existing registration in the cart — the birth date should be pre-filled from `cart_item_registration`.
6. **Order record**: Complete a checkout and inspect `order_item_registration` and `participant` — `birth_date` should be stored on both rows.
