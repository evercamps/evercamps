# National Number Field

Adds a validated Belgian national number field (known in Dutch as
"rijksregisternummer", in French as "numéro de registre national" — "National
Number" is the official English term used on Belgian eID cards) to the admin
participant form, with a checkbox to skip it for non-Belgian participants.

## Where it shows up

There is no separate "registration" form in the data model — a `registration` row
is just a link between a `participant` and a product/camp, with no personal-data
columns of its own (`packages/evercamps/src/modules/camp/migration/Version-1.0.0.ts`).
The admin "New Registration" button opens the participant form
(`/participants/new`), and editing a registration means editing the participant
(`/participants/edit/:id`). Both routes render the same shared form area
(`participantEdit+participantNew/General.tsx`, area id `participantEditGeneral`), so
a single field component wired into that area covers "create registration form",
"edit registration form", and "participant form" all at once.

- `src/pages/admin/participantEdit+participantNew/NationalNumberField.jsx` plugs
  into the `participantEditGeneral` area (`sortOrder: 25`, right after Last Name
  and before any admin-configured extra checkout fields) — no core files are
  touched. It renders the text field plus a "Not applicable" checkbox, fetches the
  existing value on the edit page via its own `query` export, and registers a
  client-side validation rule (`nationalNumber`) with the shared form validator.
- `src/lib/nationalNumber.js` is the framework-free checksum validator (mod 97,
  with the post-2000 birth-year adjustment), shared by both the browser bundle and
  the server-side hook below so the rule only lives in one place.
- `src/bootstrap.js` registers a `participantDataBeforeCreate` /
  `participantDataBeforeUpdate` processor (via the framework's value-processor
  registry) that re-validates server-side, so the check can't be bypassed by
  calling the admin API directly. This only affects `createParticipant` /
  `updateParticipant` (the admin form's services) — front-store checkout writes to
  the `participant` table directly and is unaffected.
- `src/graphql/types/Participant/Participant.graphql` extends the `Participant`
  GraphQL type with `nationalNumber` / `nationalNumberNotApplicable`, so the value
  can be queried back for the edit page. No resolver is needed: the base
  participant query already selects every column, and `camelCase()` maps
  `national_number` -> `nationalNumber` automatically.
- `src/migration/Version-1.0.0.js` adds `national_number` (nullable varchar) and
  `national_number_not_applicable` (boolean, default false) to the `participant`
  table on next boot.

## Validation

The Belgian national number is 11 digits: `YYMMDD` (birth date, `00` used when
month/day is unknown) + a 3-digit sequence number + a 2-digit checksum. The checksum
is `97 - (first 9 digits mod 97)`; people born from 2000 onward use the same formula
with `2000000000` added to the base first (the number space was extended for the new
century), so both variants are checked. Only the checksum is validated — not the
birth-date plausibility — since the "unknown day/month" convention (`00`) makes date
validation unreliable.

Checking "Not applicable" skips both client- and server-side validation entirely,
regardless of what's currently in the text field.

## Enable the extension

Already added to `config/default.json`:

```json
{
  "system": {
    "extensions": [
      {
        "name": "national-number-field",
        "resolve": "extensions/national-number-field",
        "enabled": true,
        "priority": 100
      }
    ]
  }
}
```

> **Warning**
> Enabling/disabling the extension requires running `npm run build` (or restarting
> `npm run dev`) again, and the migration runs automatically the next time the app
> boots.
