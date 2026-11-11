# Belgian Administration

Belgium-specific administration for EverCamps (formerly the `national-number-field`
plugin, renamed because it now holds more than the national number):

- **National number** - a validated Belgian national number field (known in Dutch as
  "rijksregisternummer", in French as "numéro de registre national") on the admin
  participant form, with a checkbox to skip it for non-Belgian participants. Details below.
- **Fiscal attests (281.86) and Belcotax** - in progress, see `core/.docs/fiscal-attests.md`
  and `core/.docs/plan-variant-import.md` (stages 6-9). Done so far:
  - settings page `/admin/fiscal-attests/settings` (Settings > Fiscal attests): organiser
    and company number (KBO, mod-97 checked), recognising body (municipality by default),
    signatory, Belcotax sender contact, maximum deductible amount per day per year;
  - migration `Version-1.1.0`: `customer.national_number`,
    `order_item_registration.payer_national_number` (filled from the WooCommerce import's
    `extra_data`), and the product attribute **`fiscal_attest_eligible`** ("Fiscaal attest":
    Ja / Nee), linked to every attribute group;
  - migration `Version-1.2.0`: tables `fiscal_attest`, `fiscal_attest_batch`,
    `fiscal_attest_amount_override`, `fiscal_attest_payer`.

> Attribute groups created *after* the 1.1.0 migration don't get `fiscal_attest_eligible`
> automatically: add it to the group on the attribute edit page.

## National number

### Where it shows up

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

### Validation

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

Registered in `config/default.json`:

```json
{
  "system": {
    "extensions": [
      {
        "name": "belgian-administration",
        "resolve": "content/plugins/belgian-administration",
        "enabled": true,
        "priority": 100
      }
    ]
  }
}
```

Migrations are tracked per plugin name. After the rename, `Version-1.0.0` runs once
more under `belgian-administration` (harmless: `ADD COLUMN IF NOT EXISTS`), and
`Version-1.1.0` removes the old `national-number-field` migration row and carries over a
`plugin_enabled.national-number-field` override from `/plugin-management`.

> **Warning**
> Enabling/disabling the extension requires running `npm run build` (or restarting
> `npm run dev`) again, and migrations run automatically the next time the app boots.
> In production the plugin needs its `dist/` folder: `npm run compile` builds it.
