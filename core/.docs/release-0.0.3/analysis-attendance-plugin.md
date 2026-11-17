# Analysis: attendance tracker as a plugin

Source: `core/.docs/release-0.0.3/planning.md` (features) [analysis]

> attendance tracker: for another website I've made a tool where people can say when they come to
> the training, now they want to add it as well subscriptions for the sports camps. They want to keep
> the attendance tracker for the trainings. I think for the camps it can be useful as well though.
> => make it possible to add attendance through a plugin. Just create a big overview over how this
> can be solved in a simple way.

All paths are relative to the repo root. This is a static code analysis; nothing was run.

## Short answer

Attendance fits well as a **separate plugin** (`content/plugins/attendance`). Core already has
everything it needs to hang on: a `registration` row per child per product/variant, a parent
(`customer`) linked to each child, dated attribute options for camp weeks, area-based page
injection, and a plugin migration system that can create its own tables.

The plugin only needs two new concepts:

1. **Session**: one moment someone can attend (a training on Tuesday 18:00, or day 3 of a camp
   week). Linked to a product, optionally to one variant.
2. **Attendance**: one row per (session, registration) with a status: *coming / not coming*
   (announced by the parent) and *present / absent* (checked by the monitor or trainer).

Recommended path: start with **option B** (sessions + attendance, admin list, parent account page),
and add a mobile check-in page later (option C). Details below.

---

## 1. Current state

### 1.1 What a "camp" is in the data

| Thing | Table / code | Notes |
|---|---|---|
| Camp or training offer | `product` (`core/modules/catalog/migration/Version-1.0.0.ts:175`) | `manage_registrations` flag, default true (`catalog/migration/Version-1.0.8.ts:7`) |
| Week / group / option | `product_variant` (`catalog/migration/Version-1.0.9.ts:7-20`) | Every product has at least a default variant (`catalog/migration/Version-1.1.1.ts`) |
| Variant's options | `variant_attribute_value` → `attribute_option` (`Version-1.0.9.ts:31-40`) | e.g. option "Week 1 zomer" |
| Dates of an option | `attribute_option.start_date`, `end_date`, `day_count` (`catalog/migration/Version-1.1.2.ts:10-13`) | Added for display and fiscal attests |
| Seats | `inventory_item.total_seats` per variant (`Version-1.0.9.ts:74-83`) + `inventory_reservation` (`oms/migration/Version-1.0.5.ts:9-21`) | |
| Child | `participant` (`camp/migration/Version-1.0.0.ts:6-12`), `customer_id` added in `Version-1.0.1.ts` | Parent link is `participant.customer_id` |
| Subscription | `registration` (`camp/migration/Version-1.0.0.ts:16-23`), `product_variant_id` (`Version-1.0.3.ts`, FK in `Version-1.0.4.ts`) | One row per child per product + variant |

So a "camp week" is either a product, or a variant of a product that carries a dated option.
The care period of a registration can already be computed: `content/plugins/belgian-administration/src/lib/carePeriod.ts`
(`resolveCarePeriod`, variant option wins over product option). The attendance plugin can reuse
the same rule to generate the days of a camp week.

There is **no concept of a recurring schedule** (weekday + time + season). A training season would
be a product such as "Trainingen U10 2026-2027" with variants per group, but nothing says *when*
the trainings happen. That is the main missing piece.

### 1.2 Registration lifecycle (important for attendance data)

- Created at checkout (`core/modules/checkout/services/orderCreator.ts`, `saveOrderItems` is
  hookable at `:329`) or by the admin (`camp/services/registration/createRegistration.ts:98-116`).
- Deleted by the admin: hard `DELETE` (`camp/services/registration/deleteRegistration.ts:12-14`,
  hookable at `:30`).
- Deleted on order cancel: `removeRegistrationsAndParticipants`
  (`core/modules/oms/services/cancelOrder.ts:72-112`) hard-deletes the registration (`:95-98`) and
  even the participant when no registrations remain (`:105-109`). Hookable at `:163`.
- No events are emitted for registrations. The only events are `order_placed` and
  `customer_registered` (e.g. `cod/api/createOrder/[placeOrder]addOrderPlacedEvent.ts:17`).

Consequence: if attendance rows reference `registration` with `ON DELETE CASCADE`, a cancel or
admin delete removes the attendance history too. That is fine for "who is coming next week",
but not for history/statistics. See 3.3.

### 1.3 Plugin building blocks that already exist

| Need | Existing mechanism | Example |
|---|---|---|
| Own tables | Plugin migrations `src/migration/Version-x.y.z.ts` | `belgian-administration/src/migration/Version-1.2.0.ts` (FK to `registration` with cascade at `:69`, `:81`) |
| Admin menu item under "Camp" | Component with `layout.areaId = 'campMenuGroup'` | `belgian-administration/src/pages/admin/all/FiscalAttestMenuItem.tsx:18`; group defined in `camp/pages/admin/all/CampsMenuGroup.tsx:13` |
| New admin page | `route.json` + `index.ts` + component in area `content` | `belgian-administration/src/pages/admin/fiscalAttests/` |
| Field on product form | Area `productStatusRegistrations` | `catalog/pages/admin/productEdit+productNew/Status.tsx:77`, used by `FiscalAttestEligible.tsx` |
| Block on participant page | Area `rightSide` on `participantEdit` | `camp/pages/admin/participantEdit/Registrations.tsx:272` |
| Parent account page block | Areas `accountPageOrderHistory`, `accountPageInfo` | `customer/pages/frontStore/account/Layout.tsx:43,58`; plugin examples `belgian-administration/src/pages/frontStore/account/FiscalAttests.tsx:64` |
| Parent's children | `Customer.participants` | `customer/graphql/types/Customer/Customer.graphql:32`, resolver `Customer.resolvers.ts:38-49` |
| GraphQL types (admin-only via `.admin.graphql`) | Plugin `src/graphql/types/*` | `belgian-administration/src/graphql/types/FiscalAttestSetting/` |
| REST writes | Plugin `src/api/<route>/route.json` (`access: public/private`) | all belgian-administration APIs |
| Hooks on core functions | `hookAfter` / `addProcessor` in `bootstrap.ts` | `belgian-administration/src/bootstrap.ts:73-85` |
| Scheduled jobs (reminders, cleanup) | `registerJob` | `includes/lib/cronjob/jobManager.ts:219` |
| Export / PDF | CSV and `pdfkit` already used in a plugin | `belgian-administration` (`exportFiscalAttestBatch`, `pdf.ts`) |
| Registration filters per product/variant | `product_uuid`, `variant_uuid` | `camp/services/registerDefaultRegistrationCollectionFilters.ts:36,44` |

Nothing in core has to change for a first version. A few small core hooks would help (section 5).

---

## 2. Concepts

### 2.1 Two kinds of offer

| | Training (season subscription) | Camp (fixed week) |
|---|---|---|
| Duration | Months, e.g. Sept–June | 1 week, 3–5 days |
| Sessions | Recurring, e.g. every Tue + Thu 18:00, minus holidays | Every weekday between start and end date |
| How sessions are made | Schedule rule → generated list, admin can cancel single dates | Generated from the dated option (`start_date`..`end_date`) |
| Main question | "Who comes this Tuesday?" (parent announces) | "Is everyone here today?" (monitor checks) |
| Default status | Configurable: *expected* or *unknown* | *expected* (they paid for the week) |

The same two tables cover both. Only the way sessions are created differs.

### 2.2 Two kinds of status

Keep them separate, because they are set by different people at different times:

- **Announcement** (parent, before): `coming`, `not_coming`, empty = no answer. Optional reason
  ("sick", "holiday").
- **Check-in** (monitor/trainer, during): `present`, `absent`, `late`, empty = not checked yet.

This allows simple reports: "announced not coming but was present", "no answer and absent"
(follow up), and attendance percentage per child.

### 2.3 Who does what

| Role | Action | Where |
|---|---|---|
| Admin | Set up the schedule per product/variant, cancel a session, print list | Admin |
| Parent (customer) | Mark own child coming / not coming, see history | Account page |
| Monitor / trainer | Check in children for today's session | Admin page (phone-friendly) or a separate PIN/link page |

Monitors are the tricky part: EverShop admin users are all full admins (no roles). See questions.

---

## 3. Data model

### 3.1 Tables (plugin migration `Version-1.0.0.ts`)

```sql
-- How sessions are generated for a product (or one variant of it)
CREATE TABLE IF NOT EXISTS attendance_schedule (
  attendance_schedule_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id INT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
  product_variant_id INT NULL REFERENCES product_variant(product_variant_id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,            -- 'camp_days' | 'weekly'
  weekdays INT[] NULL,              -- weekly: e.g. {2,4}
  start_time TIME NULL, end_time TIME NULL,
  start_date DATE NULL, end_date DATE NULL,   -- weekly: season; camp_days: from option if NULL
  announce_deadline_hours INT NULL, -- parents can change until X hours before
  default_status VARCHAR NULL,      -- 'expected' | 'unknown'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One moment someone can attend
CREATE TABLE IF NOT EXISTS attendance_session (
  attendance_session_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid UUID NOT NULL DEFAULT gen_random_uuid(),
  schedule_id INT NULL REFERENCES attendance_schedule(attendance_schedule_id) ON DELETE SET NULL,
  product_id INT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
  product_variant_id INT NULL REFERENCES product_variant(product_variant_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NULL, end_time TIME NULL,
  title VARCHAR NULL,               -- "Day 2", "Extra training"
  is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (product_id, product_variant_id, date, start_time)
);

-- One child at one session
CREATE TABLE IF NOT EXISTS attendance (
  attendance_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id INT NOT NULL REFERENCES attendance_session(attendance_session_id) ON DELETE CASCADE,
  registration_id INT NULL REFERENCES registration(registration_id) ON DELETE SET NULL,
  participant_id INT NULL REFERENCES participant(participant_id) ON DELETE SET NULL,
  participant_name VARCHAR NOT NULL,   -- snapshot, so history survives deletes
  announcement VARCHAR NULL,           -- 'coming' | 'not_coming'
  announcement_note VARCHAR NULL,
  announced_by_customer_id INT NULL REFERENCES customer(customer_id) ON DELETE SET NULL,
  announced_at TIMESTAMP NULL,
  checkin VARCHAR NULL,                -- 'present' | 'absent' | 'late'
  checked_by_admin_user_id INT NULL,
  checked_at TIMESTAMP NULL,
  UNIQUE (session_id, participant_id)
);
```

### 3.2 Sparse vs. pre-filled attendance rows

| | Sparse (row only when someone sets a status) | Pre-filled (row per registration per session) |
|---|---|---|
| Who is expected | Computed: registrations of the product/variant LEFT JOIN attendance | Stored |
| New registration mid-season | Automatically included | Needs a hook to create rows for future sessions |
| Cancelled registration | Automatically gone from future lists | Needs a hook to delete future rows |
| Rows | Few | Many (30 children × 60 trainings = 1800 per group) |

**Recommendation: sparse.** The list for a session is "all registrations for this product
(+ variant) LEFT JOIN attendance for this session". This keeps the plugin independent of
registration create/delete flows, which is the main point of a simple plugin.

### 3.3 Keeping history when registrations disappear

Because `cancelOrder` and the admin delete hard-delete registrations (1.2), use `ON DELETE SET NULL`
on `registration_id`/`participant_id` plus a `participant_name` snapshot, as above. Past rows stay
for statistics; the child just drops out of future lists. If history is not needed, `CASCADE` is
simpler.

Note: the open 0.0.3 fix "Cancelling an order can delete the same child's registration for another
week" (`cancelOrder.ts:95-98` deletes on participant + product, ignoring the variant) would also
wipe the wrong child's attendance link for the other week. Fixing that first is advised.

### 3.4 Alternative: no session table

Store `attendance(registration_id, date, status)` only and derive dates on the fly (option dates
for camps, weekdays for trainings). Fewer tables, but no place to cancel one training, add an
extra session, or set a time. Only fine for option A below.

---

## 4. UI touchpoints

| # | Page | Who | What | How (plugin) |
|---|---|---|---|---|
| 1 | Product edit → "Attendance" card | Admin | Turn tracking on, choose camp days / weekly schedule, season dates, deadline | Component in `productStatusRegistrations` area or `rightSide`; save via own API (not the product form, to stay out of `productDataBeforeUpdate`) |
| 2 | Camp → Attendance (session list) | Admin | Filter by product/variant/date, see counts (registered / coming / not coming / no answer / present) | New page `pages/admin/attendanceSessions/` + menu item in `campMenuGroup` |
| 3 | Session detail | Admin / monitor | List of children with announcement and check-in toggles; big buttons, works on phone; **print** view (names, birth date, parent phone, empty checkbox column) | New page `pages/admin/attendanceSession/`; print with CSS `@media print` or PDF via `pdfkit` |
| 4 | Participant edit → "Attendance" block | Admin | History and percentage per registration | Component in `rightSide` area of `participantEdit` |
| 5 | My account → "Attendance" | Parent | Per child, upcoming sessions with coming / not coming toggle (until deadline), past sessions read-only | Component in `accountPageOrderHistory` (or a new account page with its own route); data via `Customer.participants` + new `Participant.attendanceSessions` field |
| 6 | Export | Admin | CSV per session or per product/period (child, date, announcement, check-in) | API route returning `text/csv`, like `exportFiscalAttestBatch` |
| 7 | Reminder (later) | Parent | "Will X come to training tomorrow?" with one-click links | `registerJob` + mail module (planned in 0.0.3 emails item); signed links per attendance row |

GraphQL (sketch):

```graphql
type AttendanceSession { uuid: String! date: String! startTime: String title: String
  isCancelled: Boolean! product: Product variantTitle: String
  counts: AttendanceCounts! rows: [AttendanceRow!]! }
type AttendanceRow { participant: Participant registrationId: Int
  announcement: String checkin: String note: String }
extend type Participant { attendanceSessions(from: String, to: String): [AttendanceRowWithSession!]! }
extend type Query { attendanceSessions(filters: [FilterInput]): [AttendanceSession!]! }
```

Admin-only fields in `*.admin.graphql`; the storefront `Participant` extension must check that the
participant's `customer_id` is the logged-in customer.

APIs (REST, like the rest of the codebase):

| Route | Access | Purpose |
|---|---|---|
| `POST /attendance/schedules` | private | Save schedule for a product/variant, (re)generate sessions |
| `PATCH /attendance/sessions/:uuid` | private | Cancel / rename a session |
| `POST /attendance/sessions/:uuid/checkin` | private | Set check-in for one or more children |
| `POST /attendance/announce` | public + customer session | Parent sets coming / not coming; check child belongs to customer and deadline not passed |
| `GET /attendance/export` | private | CSV |

---

## 5. Integration with existing flows

| Flow | Effect with sparse model | Needed hook |
|---|---|---|
| New registration (checkout/admin) | Child appears in future session lists automatically | None |
| Admin deletes registration | Child disappears from future lists; history kept (SET NULL) | None |
| Order cancelled | Same, via `cancelOrder.ts:72-112` | None (optional `hookAfter('removeRegistrationsAndParticipants')` to log) |
| Participant merge (`participantMergeBeforeDelete`, used by `belgian-administration/src/bootstrap.ts:85`) | Attendance rows of the removed participant must move | `addProcessor('participantMergeBeforeDelete', ...)` |
| Variant/product deleted | Sessions cascade away | None |
| Camp dates changed on the option | Generated sessions are stale | "Regenerate sessions" button; keep sessions with data |
| Plugin disabled | Tables and data stay (README: migrations are forward-only) | None |

Useful small core changes (not required):
- Emit `registration_created` / `registration_deleted` events, so plugins can react without
  hooking private functions.
- Soft-delete or "cancelled" status on `registration` instead of a hard delete (also helps the
  open cancel fixes in 0.0.3).
- Simple admin roles, if monitors should only see attendance.

---

## 6. Options

### A. Minimal: camp day list + check-in

Only camps. No schedule, no session table: dates come from the variant/product option
(`carePeriod.ts`). Admin page per variant shows a grid children × days with check boxes and a print
button. Table: `attendance(registration_id, date, checkin)`.
- Pros: very small, no setup per product, useful at the camp itself.
- Cons: no trainings, no parent announcement, no cancelled days or times. Has to be reworked for
  the client's actual need (trainings).
- Effort: **S (about 1–2 days)**.

### B. Sessions + parent announcement + admin list: recommended

The data model of section 3 (schedule, session, sparse attendance). Product attendance card with
two schedule types (camp days / weekly), session overview, session detail with check-in and print,
parent account block with coming / not coming, participant history block, CSV export.
- Pros: covers both trainings and camps with one model; matches the client's existing tool;
  fully inside a plugin; no core changes.
- Cons: monitors need an admin login; no reminders until the mail module exists; schedule
  generation (holidays, cancelled dates) needs some care.
- Effort: **M (about 4–6 days)**.

### C. Full: B + monitor app + reminders + stats

On top of B: a phone-first check-in page for monitors with a per-session PIN or signed link (no
admin account), reminder mails the day before with one-click "coming / not coming" links,
statistics (attendance % per child/group, no-shows), optionally a waiting list that offers a free
spot when someone announces "not coming" (only relevant if trainings have capacity per session).
- Pros: complete replacement of the other tool; less admin work per week.
- Cons: needs the mail module and a secure public link/PIN design; more UI to maintain.
- Effort: **L (about 8–12 days)**, depends on the email feature.

| | Trainings | Camps | Parent announces | Check-in | Print / export | Core changes | Effort |
|---|---|---|---|---|---|---|---|
| A. Camp day list | no | yes | no | admin | print | none | S |
| B. Sessions + announcement | yes | yes | yes (account) | admin (phone OK) | print + CSV | none | M |
| C. Full | yes | yes | yes (+ mail links) | monitor link/PIN | + stats | events/roles nice-to-have | L |

---

## 7. Recommendation and phases

Go with **B**, built so C can be added without migrating data.

1. **Phase 1 (core of B)**: plugin skeleton (`content/plugins/attendance`, copy
   `belgian-administration` `package.json`/`tsconfig.json`/`core.ts`), migration with the three
   tables, product "Attendance" card, session generation (camp days from option dates, weekly from
   schedule), admin session overview + detail with check-in, print view.
2. **Phase 2**: parent account block (coming / not coming with deadline), participant history
   block, CSV export, `participantMergeBeforeDelete` processor.
3. **Phase 3 (C)**: reminder job + mail with signed links (after the email feature), monitor
   check-in via PIN/link, statistics.

Before phase 1, fix the "cancel deletes another week's registration" issue, since it affects which
children appear on attendance lists.

---

## 8. Questions for the client

1. Trainings: how are they sold today? One season subscription per group, per day, or a card of N
   trainings? Is there a price per training, or is attendance purely informational?
2. Default for trainings: is a child *expected unless they say no*, or *only coming if they say
   yes*?
3. Until when can parents change their answer (e.g. 2 hours before, the day before at 20:00)?
4. Should a reason be asked when a child does not come (sick, holiday, other)?
5. Who checks children in? Trainers/monitors with their own login, a shared device, or nobody
   (only parent announcements)?
6. Is a printed list enough at the camp, or do monitors need a phone check-in? Which columns on the
   list (allergies, parent phone, pick-up person)?
7. Must history be kept after a cancellation, and for how long (GDPR)?
8. Do they want reminders by mail (or another channel) before each training?
9. Are holidays / cancelled trainings known in advance (school holiday calendar), or cancelled ad hoc?
10. Is there a maximum per training session (capacity / waiting list), or only per subscription?
11. Should the existing tool's data be imported, and should the old tool keep running in parallel?
12. Is attendance relevant for invoicing or fiscal attests (e.g. paying only attended days)? Today
    fiscal attests use the dated option's `day_count`, not real attendance.
