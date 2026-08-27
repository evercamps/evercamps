# Participant merge tool

## Context

The camps module (`core/modules/camp`) has no duplicate-participant cleanup path today. Two
places already try to prevent *exact* duplicates:

- `services/participant/createParticipant.ts` rejects a create when a participant with the same
  `first_name`/`last_name` (+ any `participant_checkout_fields` marked `useForUniqueness`) already
  exists.
- `services/orderCreator.ts` (`checkout` module, `saveOrderItems`, ~line 148) does the same
  match-or-create at checkout time.

Neither catches near-duplicates (typos, casing, extra whitespace, nicknames), and neither existed
for whatever data came in before these checks were added (imports, early manual entry) — that's
where real duplicates come from today.

`participant` has a single nullable `customer_id` (`migration/Version-1.0.1.ts`) — at most one
customer is ever associated with a participant today. That stays as-is: when two duplicate
participant rows carry *different* customers, the merge simply asks the admin which one to keep,
the same way it asks which first name or birth date to keep. No schema change needed for this;
adding a many-to-many `participant_customer` table was considered and dropped as unnecessary
complexity for the value it added.

Scope: **admin tool only** (`pages/admin`), consistent with the rest of participant/registration
management. No frontstore changes.

## Phase 1 — Duplicate detection

**Candidate generation stays in SQL**, not loaded wholesale into Node:

- `CREATE EXTENSION IF NOT EXISTS pg_trgm;` + a functional trigram index in the same migration:
  ```sql
  CREATE INDEX participant_name_trgm_idx ON participant
    USING GIN ((first_name || ' ' || last_name) gin_trgm_ops);
  ```
  ⚠️ Confirm the hosting Postgres allows `CREATE EXTENSION` before committing to this (some managed
  providers restrict it, though `pg_trgm` is on the standard allow-list for RDS/Cloud SQL/etc.). If
  it turns out to be blocked, fall back to the normalized-exact baseline below only, and revisit
  fuzzy scoring later — don't block the rest of the tool on it.
- New `services/participant/findDuplicateParticipants.ts`:
  - Baseline (always runs, no extension needed): group by
    `lower(trim(regexp_replace(first_name, '\s+', ' ', 'g')))` +
    `lower(trim(regexp_replace(last_name, '\s+', ' ', 'g')))`, `HAVING count(*) > 1`. Catches
    casing/whitespace variants and true exact repeats from pre-uniqueness-check data.
  - Fuzzy layer (when `pg_trgm` is available): self-join
    `participant a, participant b WHERE a.participant_id < b.participant_id AND
    similarity(a.first_name || ' ' || a.last_name, b.first_name || ' ' || b.last_name) > :threshold`
    (default threshold ~0.45, exposed as a query param so the admin UI can loosen/tighten it).
  - Union-find the pairwise matches in application code into clusters (a participant can be close
    to more than one other), since a merge group can have >2 members.
  - Return `{ key: string, score: number, participants: Participant[] }[]`, each cluster carrying
    its registrations count and customer list so the grid doesn't need per-row follow-up queries.

## Phase 2 — GraphQL: expose duplicate groups

`graphql/types/Participant/Participant.graphql` additions:

```graphql
type ParticipantDuplicateGroup {
  key: String!
  score: Float!
  participants: [Participant!]!
}

extend type Query {
  participantDuplicateGroups(threshold: Float): [ParticipantDuplicateGroup!]!
}
```

Resolver calls `findDuplicateParticipants` from Phase 1. `Participant.registrations` and
`Participant.customer` are already queryable per-participant, so the group query doesn't need to
duplicate that data in its own type — the admin UI queries them per participant in the merge view.

## Phase 3 — Merge service

New `services/participant/mergeParticipants.ts`, transactional, same shape as
`updateParticipant.ts`/`deleteParticipant.ts` (`getConnection` → `startTransaction` → … → `commit`/
`rollback`, wrapped in `hookable`):

```ts
type MergeParticipantsInput = {
  survivorUuid: string;
  duplicateUuid: string;
  fields: Record<string, unknown>;       // winning value per column, from the diff UI
  registrationOverrides?: Record<number /* product_id */, 'survivor' | 'duplicate'>;
};
```

Steps inside one transaction:

1. Load both participants by `uuid`; 404 if either is missing, 400 if `survivorUuid === duplicateUuid`.
2. Apply `fields` to the survivor via the same ajv validation `updateParticipant.ts` already uses
   (`participantDataSchema`) — reuse, don't reimplement. `fields` can include `customer_id`: it's
   just another column the admin picked a winner for in the diff UI, same as `first_name` — no
   special-casing needed since `participant` only ever has one customer.
3. **Registrations**: `registration_participant_id` has no DB-level uniqueness on
   `(participant, product)` — only `createRegistration.ts` enforces it at insert time — so a bulk
   move needs to do that check itself:
   - For each `registration_product_id` present on **both** the survivor and the duplicate
     (a collision), consult `registrationOverrides[product_id]`; whichever side loses gets its
     registration row deleted, the winning side's is left as-is. Default (if the admin didn't pick)
     is `'survivor'`.
   - For every other duplicate registration, `UPDATE registration SET registration_participant_id
     = survivor_id WHERE registration_id = ...`.
4. Give plugins a chance to move their own side-table data before the row disappears: emit through
   `getValue('participantMergeBeforeDelete', { survivorId, duplicateId }, context)` (same
   `hookable`/registry pattern as `participantDataBeforeCreate`) — e.g. an extension like
   `national-number-field` (see `wordpress-import.md`) that key rows off `participant_id` needs
   this to not silently lose data. Document the hook so such extensions can register it; not
   implementing any specific consumer here.
5. `DELETE FROM participant WHERE participant_id = duplicate_id` (`registration` was already
   emptied in step 3).
6. `commit`, return `{ survivor, movedRegistrations, droppedRegistrations }` for the UI's success
   summary.

New REST endpoint (module still uses the old route.json/bracket-file convention — see
`.docs/routes-naming-steps.md`, camp isn't migrated to `routes.ts` yet):

- `core/modules/camp/api/mergeParticipant/route.json` → `{"methods": ["POST"], "path": "/participants/merge", "access": "private"}`
- `core/modules/camp/api/mergeParticipant/mergeParticipant.ts` → same try/catch → `INTERNAL_SERVER_ERROR`/`OK` JSON shape as `deleteParticipant.ts`.

## Phase 4 — Admin UI

**Entry point**: add a "Possible duplicates" badge/link next to the search bar in
`pages/admin/participantGrid/Grid.tsx` (or a small item in `CampsMenuGroup.tsx`), showing the
duplicate-group count from `participantDuplicateGroups`.

**New page** `pages/admin/participantDuplicates/` (routeId `participantDuplicates`, path
`/participants/duplicates`, following the existing `route.json` + `index.ts` pattern):

- `Grid.tsx`: one row per cluster from `participantDuplicateGroups` — names, registration counts,
  customer counts, a similarity score, and a "Review merge" action per group (per pair, if the
  cluster has more than 2 members — pick two at a time rather than an N-way merge UI).
- `ParticipantMergeForm.tsx` (opened per pair, similar structural role to
  `participantEdit+participantNew/FormContent.tsx`):
  - Column-per-participant comparison table. Header row lets the admin pick which participant is
    the **survivor** (the one whose `uuid`/`participant_id` — and therefore existing deep links —
    persists).
  - One row per mergeable field (`First name`, `Last name`, `Birth date`, `Customer` — rendered
    from `Participant.customer`, same as the other fields, since a participant only ever has one —
    plus any `participant_checkout_fields`) with a radio per participant's value; defaults to the
    survivor's current value pre-selected.
  - A registrations section listing both participants' registrations
    (`getRegistrationsByParticipantBaseQuery`-backed), highlighting product collisions and letting
    the admin pick survivor-vs-duplicate per colliding product (feeds `registrationOverrides`);
    non-colliding registrations are shown read-only as "will be moved."
  - Submit → `POST /participants/merge` → on success, redirect to the survivor's
    `participantEdit` page with a success toast; on failure, surface the error inline (same
    `useAlertContext` pattern used elsewhere in this module, e.g. `participantGrid/Grid.tsx`'s
    delete-confirmation flow).

## Rollout order

1. Phase 1 detection service (+ `pg_trgm` migration, with the exact-match baseline as a safe
   fallback if the extension can't be enabled).
2. Phase 2 GraphQL query.
3. Phase 3 merge service + REST endpoint — the only step that deletes data; test rollback paths
   (mid-transaction failure) explicitly.
4. Phase 4 admin UI, last, once there's real data to show it.

## Verification

- After Phase 1: seed a couple of near-duplicate participants (e.g. `"Jane Doe"` / `"jane  doe"` /
  `"Jane Doo"`) and confirm `participantDuplicateGroups` clusters them; confirm a clearly unrelated
  pair (`"Jane Doe"` vs `"John Smith"`) does not appear.
- After Phase 3: merge two participants that (a) share a registration for the same product — confirm
  only one survives and the unchosen one plus its `order_item_registration` link is gone cleanly;
  (b) each have a different customer attached — confirm the admin's chosen `customer_id` wins and
  is the only one left on the survivor; (c) mid-merge failure (e.g. throw inside the hook point in
  step 4) — confirm the transaction rolls back and neither participant is touched.
- After Phase 4: full click-through — open "Possible duplicates," review a pair, flip a couple of
  field choices (including which customer wins) and a registration collision choice, submit, land
  on the survivor's edit page, and confirm the duplicate no longer appears in `participantGrid`.

## Open decisions to confirm before implementation

- Similarity threshold default (0.45 above is a starting guess, not tuned against real data) and
  whether it should be a stored setting (`campSetting`) rather than just a query param.
- Whether an N-member duplicate cluster should support merging more than one pair in a single
  submit, or whether repeated pairwise merges (this plan's default) are good enough.
