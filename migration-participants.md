# Participant Deduplication Migration

## Problem

During checkout, subscribers enter a `firstName` and `lastName` to register a participant for a sportscamp. This creates a record in the `participant` table. The current deduplication strategy matches on `(first_name, last_name)` globally — which causes two issues:

1. **Unrelated people share a participant record.** Two different customers who register a child named "Emma Janssen" end up pointing at the same participant row.
2. **Guest records accumulate and never get claimed.** When a guest later logs in and picks their "real" participants, the old guest-created rows (where `customer_id IS NULL`) remain in the table as orphans.

The goal is to keep the checkout flow simple (firstName + lastName is enough) while stopping the duplication from building up over time.

---

## Current Flow (as-is)

```
Guest checkout
  └─ addCartItem        → registrations[] stored in memory (firstName, lastName)
  └─ saveCart           → persisted to cart_item_registration (firstName, lastName)
  └─ createOrder        → orderCreator.ts:
       ├─ SELECT participant WHERE first_name = X AND last_name = Y  ← global name match
       ├─ if found → reuse (regardless of who owns it)
       └─ if not found → INSERT participant (customer_id = NULL)
            └─ INSERT registration (participant → product)

Authenticated checkout
  └─ same as above, but after participant is created/reused:
       └─ UPDATE participant SET customer_id = $id WHERE customer_id IS NULL
```

**Key file:** `packages/evercamps/src/modules/checkout/services/orderCreator.ts`

---

## Root Causes

| Cause | Effect |
|---|---|
| Dedup is global by name | Unrelated customers share participant records |
| No UNIQUE constraint on participant | Race conditions can create true duplicates |
| `customer_id` is set after the fact, not on creation | Window where authenticated participant looks like a guest |
| No merge/claim flow post-login | Guest records never get cleaned up |

---

## Proposed Solution

Three phases in increasing complexity. Each phase is independently shippable.

---

### Phase 1 — Fix deduplication logic (low risk, high impact)

**Goal:** Stop different customers from sharing the same participant record and prevent race-condition duplicates.

#### 1a. Scope the dedup query by customer

In `orderCreator.ts`, change the dedup check:

```typescript
// BEFORE — matches any participant globally
SELECT * FROM participant WHERE first_name = X AND last_name = Y

// AFTER — for authenticated users: match within this customer only
SELECT * FROM participant WHERE first_name = X AND last_name = Y AND customer_id = $customerId

// AFTER — for guests: match unowned participants only
SELECT * FROM participant WHERE first_name = X AND last_name = Y AND customer_id IS NULL
```

This prevents two customers from inadvertently sharing a participant.

#### 1b. Set customer_id at creation, not after

For authenticated checkouts, pass `customer_id` directly into the `INSERT` instead of running a second `UPDATE`:

```typescript
// BEFORE
INSERT INTO participant (first_name, last_name) ...
UPDATE participant SET customer_id = $id WHERE participant_id = $new AND customer_id IS NULL

// AFTER
INSERT INTO participant (first_name, last_name, customer_id) VALUES (X, Y, $customerId)
```

#### 1c. Add a partial UNIQUE index for guest participants

Prevents database-level duplicate guest records even under concurrent load:

```sql
-- New migration (e.g. Version-1.0.2 in camp module)
CREATE UNIQUE INDEX uq_participant_guest_name
  ON participant (lower(first_name), lower(last_name))
  WHERE customer_id IS NULL;
```

> Note: this index only covers unowned participants. Owned participants (`customer_id IS NOT NULL`) are already unique per customer after Phase 1a.

---

### Phase 2 — Participant picker in checkout for logged-in users (medium complexity)

**Goal:** When a user is already logged in, let them select from their existing participants instead of typing names again. This eliminates new duplicates at the source.

#### 2a. Schema change — add participant_id to cart_item_registration

```sql
-- New migration in checkout module
ALTER TABLE cart_item_registration
  ADD COLUMN participant_id INT NULL
  REFERENCES participant(participant_id) ON DELETE SET NULL;
```

#### 2b. API change — accept participant_id in addCartItem

When `context.participant_id` is provided:
- Skip name fields
- Store `participant_id` directly on `cart_item_registration`
- In `orderCreator.ts`: if `cart_item_registration.participant_id` is set → use it directly, skip dedup lookup entirely

#### 2c. Frontend — participant picker component

In the checkout registration step, when the user is authenticated:

```
[Select participant]
  ● Emma Janssen          ← existing participant
  ● Luca De Backer        ← existing participant
  + Add new participant   ← falls back to firstName/lastName text fields
```

This is the highest-leverage UX change: a logged-in user should almost never need to type names again.

---

### Phase 3 — "Claim your past orders" flow (medium/long term)

**Goal:** Let a user retrospectively link guest-checkout participants to their account, enabling cleanup of orphaned guest records.

#### 3a. How to detect claimable participants

After a user logs in, query orders they placed (matched by email on the `customer` table) where the linked participant has `customer_id IS NULL`:

```sql
SELECT DISTINCT p.participant_id, p.first_name, p.last_name
FROM order o
JOIN order_item oi ON oi.order_id = o.order_id
JOIN order_item_registration oir ON oir.order_item_id = oi.order_item_id
JOIN registration r ON r.registration_id = oir.registration_id
JOIN participant p ON p.participant_id = r.registration_participant_id
WHERE o.customer_id = $customerId
  AND p.customer_id IS NULL;
```

#### 3b. Claim UI

Show a one-time prompt (dismissible) in the user's account or next checkout:

> "We found participants from previous orders. Would you like to add them to your profile?"
>
> - Emma Janssen → [Add to my participants] [Ignore]

#### 3c. Merge logic

When a user claims a guest participant:

```typescript
// If customer already has a participant with the same name → merge
UPDATE registration
  SET registration_participant_id = $keptId
  WHERE registration_participant_id = $guestId;

DELETE FROM participant WHERE participant_id = $guestId;

// If no matching participant exists → simply claim
UPDATE participant
  SET customer_id = $customerId
  WHERE participant_id = $guestId;
```

The `addCustomer` service in `packages/evercamps/src/modules/camp/services/participant/addCustomer.ts` already implements the claim logic — Phase 3 mainly needs the detection query and the UI trigger.

---

## Schema Changes Summary

| Migration | Table | Change |
|---|---|---|
| camp `Version-1.0.2` | `participant` | Add partial UNIQUE index on `(lower(first_name), lower(last_name)) WHERE customer_id IS NULL` |
| checkout `Version-1.0.8` | `cart_item_registration` | Add nullable `participant_id` FK → `participant(participant_id)` |

---

## One-time Cleanup Script

For existing data, run this once in production to merge known duplicate guest participants:

```sql
-- Find guest participants with duplicate names
WITH duplicates AS (
  SELECT
    lower(first_name) AS fn,
    lower(last_name) AS ln,
    array_agg(participant_id ORDER BY participant_id) AS ids
  FROM participant
  WHERE customer_id IS NULL
  GROUP BY 1, 2
  HAVING count(*) > 1
)
-- Reassign registrations to the lowest participant_id (canonical)
UPDATE registration r
SET registration_participant_id = (d.ids)[1]
FROM duplicates d
JOIN participant p ON lower(p.first_name) = d.fn AND lower(p.last_name) = d.ln
WHERE r.registration_participant_id = p.participant_id
  AND p.participant_id != (d.ids)[1];

-- Then delete the orphaned duplicates
DELETE FROM participant
WHERE customer_id IS NULL
  AND participant_id NOT IN (SELECT DISTINCT registration_participant_id FROM registration);
```

Run in a transaction and verify row counts before committing.

---

## Verification

| Scenario | Expected result |
|---|---|
| Two guests with same name check out | Only one `participant` row created (Phase 1c index prevents second insert) |
| Authenticated user checks out twice with same child name | Single participant row reused (Phase 1a scoped dedup) |
| Authenticated user selects existing participant in checkout | No new participant row created (Phase 2b) |
| User logs in after a guest checkout | Claim prompt appears; after claiming, guest participant is merged/claimed (Phase 3) |
| Concurrent guest checkouts with same name | DB unique index blocks duplicate at transaction level |
