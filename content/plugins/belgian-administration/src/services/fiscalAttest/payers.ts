import { commit, del, insert, rollback, select, startTransaction } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection, pool } from '../../core.js';
import { isValidNationalNumber } from '../../lib/nationalNumber.js';

// Splitting a child's fiscal attest between parents (core/.docs/fiscal-attests.md, 2b).
//
// Default (no fiscal_attest_payer rows): 100% for the order customer. A split
// is stored per registration as two rows: the customer's own share and the
// other parent's share. Customers change it per child per income year from
// their account. Once that year's attests are final, a change is stored as
// status 'requested' for the admin to approve (Stage 8/9).

const YEAR_SUFFIX = /\s(\d{4})$/;

export interface OtherParentInput {
  fullName: string;
  nationalNumber?: string | null;
  street: string;
  postcode: string;
  city: string;
  country?: string;
  sharePercent: number | string;
}

export interface ChildYearSplit {
  participantId: number;
  participantUuid: string;
  firstName: string;
  lastName: string;
  year: number;
  registrations: { registrationId: number; label: string }[];
  // true when the year's attests are final: changes become requests
  locked: boolean;
  otherParent: (OtherParentInput & { status: string }) | null;
}

interface RegistrationRow {
  registration_id: number;
  registration_participant_id: number;
  created_at: Date | string;
  product_name: string | null;
  variant_title: string | null;
}

/**
 * Income year of a registration: start date of its dated option, else the
 * year at the end of its variant title ("Week 1 zomer 2027"), else the year
 * it was created.
 */
async function registrationYears(rows: RegistrationRow[]): Promise<Map<number, number>> {
  const years = new Map<number, number>();
  if (rows.length === 0) {
    return years;
  }
  const query = select('registration.registration_id', 'attribute_option.start_date').from('registration');
  query
    .innerJoin('variant_attribute_value')
    .on('variant_attribute_value.variant_id', '=', 'registration.product_variant_id');
  query
    .innerJoin('attribute_option')
    .on('attribute_option.attribute_option_id', '=', 'variant_attribute_value.option_id');
  query
    .where('registration.registration_id', 'IN', rows.map((r) => r.registration_id))
    .and('attribute_option.start_date', 'IS NOT NULL', null);
  const dated = await query.execute(pool);
  for (const row of dated) {
    years.set(row.registration_id, new Date(row.start_date).getFullYear());
  }
  for (const row of rows) {
    if (years.has(row.registration_id)) {
      continue;
    }
    const match = String(row.variant_title ?? '').match(YEAR_SUFFIX);
    years.set(
      row.registration_id,
      match ? parseInt(match[1], 10) : new Date(row.created_at).getFullYear()
    );
  }
  return years;
}

async function customerRegistrations(customerId: number, participantId?: number): Promise<RegistrationRow[]> {
  const query = select(
    'registration.registration_id',
    'registration.registration_participant_id',
    'registration.created_at',
    'product_description.name',
    'product_variant.title'
  ).from('registration');
  query
    .innerJoin('participant')
    .on('participant.participant_id', '=', 'registration.registration_participant_id');
  query
    .leftJoin('product_description')
    .on('product_description.product_description_product_id', '=', 'registration.registration_product_id');
  query
    .leftJoin('product_variant')
    .on('product_variant.product_variant_id', '=', 'registration.product_variant_id');
  const where = query.where('participant.customer_id', '=', customerId);
  if (participantId) {
    where.and('participant.participant_id', '=', participantId);
  }
  const rows = await query.execute(pool);
  return rows.map((row: any) => ({
    registration_id: row.registration_id,
    registration_participant_id: row.registration_participant_id,
    created_at: row.created_at,
    product_name: row.name,
    variant_title: row.title
  }));
}

async function isYearFinal(participantId: number, year: number): Promise<boolean> {
  const row = await select('fiscal_attest_id')
    .from('fiscal_attest')
    .where('participant_id', '=', participantId)
    .and('income_year', '=', year)
    .and('status', '=', 'final')
    .load(pool);
  return !!row;
}

/** The customer's children, per income year, with their current split. */
export async function listChildYearSplits(customerId: number): Promise<ChildYearSplit[]> {
  const participants = await select('participant_id', 'uuid', 'first_name', 'last_name')
    .from('participant')
    .where('customer_id', '=', customerId)
    .execute(pool);
  const registrations = await customerRegistrations(customerId);
  const years = await registrationYears(registrations);
  const payerRows = registrations.length
    ? await select()
        .from('fiscal_attest_payer')
        .where('registration_id', 'IN', registrations.map((r) => r.registration_id))
        .and('customer_id', 'IS NULL', null)
        .execute(pool)
    : [];

  const result: ChildYearSplit[] = [];
  for (const participant of participants) {
    const own = registrations.filter((r) => r.registration_participant_id === participant.participant_id);
    const byYear = new Map<number, RegistrationRow[]>();
    for (const registration of own) {
      const year = years.get(registration.registration_id)!;
      byYear.set(year, [...(byYear.get(year) ?? []), registration]);
    }
    for (const [year, regs] of [...byYear.entries()].sort((a, b) => b[0] - a[0])) {
      const ids = new Set(regs.map((r) => r.registration_id));
      // The other parent = the row without a customer account; a pending
      // request wins over the active one so the customer sees their change.
      const rows = payerRows.filter((p: any) => ids.has(p.registration_id));
      const other = rows.find((p: any) => p.status === 'requested') ?? rows.find((p: any) => p.status === 'active');
      const address = other?.address ?? {};
      result.push({
        participantId: participant.participant_id,
        participantUuid: participant.uuid,
        firstName: participant.first_name,
        lastName: participant.last_name,
        year,
        registrations: regs.map((r) => ({
          registrationId: r.registration_id,
          label: [r.product_name, r.variant_title].filter(Boolean).join(' – ')
        })),
        locked: await isYearFinal(participant.participant_id, year),
        otherParent: other
          ? {
              fullName: other.full_name,
              nationalNumber: other.national_number,
              street: address.street ?? '',
              postcode: address.postcode ?? '',
              city: address.city ?? '',
              country: address.country ?? 'BE',
              sharePercent: Number(other.share_percent),
              status: other.status
            }
          : null
      });
    }
  }
  return result;
}

async function customerAsPayer(customerId: number, connection: PoolClient) {
  const customer = await select('customer_id', 'full_name', 'national_number')
    .from('customer')
    .where('customer_id', '=', customerId)
    .load(connection, false);
  const addressQuery = select().from('customer_address');
  addressQuery.where('customer_id', '=', customerId);
  addressQuery.orderBy('is_default', 'DESC');
  const address = await addressQuery.load(connection, false);
  return {
    customer_id: customer.customer_id,
    full_name: customer.full_name ?? '',
    national_number: customer.national_number ?? null,
    address: JSON.stringify({
      street: [address?.address_1, address?.address_2].filter(Boolean).join(' '),
      postcode: address?.postcode ?? '',
      city: address?.city ?? '',
      country: address?.country ?? 'BE'
    })
  };
}

/**
 * Save (or, with otherParent null, remove) the split of one child's attest
 * for one income year. Called for the logged-in customer only.
 */
export async function saveChildYearSplit(
  customerId: number,
  participantUuid: string,
  year: number,
  otherParent: OtherParentInput | null
): Promise<void> {
  const participant = await select('participant_id')
    .from('participant')
    .where('uuid', '=', participantUuid)
    .and('customer_id', '=', customerId)
    .load(pool);
  if (!participant) {
    throw new Error('Participant not found');
  }
  const registrations = await customerRegistrations(customerId, participant.participant_id);
  const years = await registrationYears(registrations);
  const ids = registrations.filter((r) => years.get(r.registration_id) === year).map((r) => r.registration_id);
  if (ids.length === 0) {
    throw new Error('No registrations for this child in that year');
  }

  let share = 0;
  let nationalNumber: string | null = null;
  if (otherParent) {
    share = Number(otherParent.sharePercent);
    if (!(share > 0 && share < 100)) {
      throw new Error("The other parent's share must be between 1 and 99%");
    }
    if (!String(otherParent.fullName ?? '').trim()) {
      throw new Error("The other parent's name is required");
    }
    if (!otherParent.street || !otherParent.postcode || !otherParent.city) {
      throw new Error("The other parent's address is required");
    }
    nationalNumber = String(otherParent.nationalNumber ?? '').replace(/\D/g, '') || null;
    if (nationalNumber && !isValidNationalNumber(nationalNumber)) {
      throw new Error("The other parent's national number is not a valid Belgian national number");
    }
  }

  const status = (await isYearFinal(participant.participant_id, year)) ? 'requested' : 'active';
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    // Replace the customer's own rows with this status for these registrations.
    await del('fiscal_attest_payer')
      .where('registration_id', 'IN', ids)
      .and('source', '=', 'customer')
      .and('status', '=', status)
      .execute(connection, false);

    if (otherParent) {
      const self = await customerAsPayer(customerId, connection);
      for (const registrationId of ids) {
        await insert('fiscal_attest_payer')
          .given({
            registration_id: registrationId,
            ...self,
            share_percent: 100 - share,
            source: 'customer',
            status
          })
          .execute(connection, false);
        await insert('fiscal_attest_payer')
          .given({
            registration_id: registrationId,
            customer_id: null,
            full_name: String(otherParent.fullName).trim(),
            national_number: nationalNumber,
            address: JSON.stringify({
              street: otherParent.street,
              postcode: otherParent.postcode,
              city: otherParent.city,
              country: otherParent.country || 'BE'
            }),
            share_percent: share,
            source: 'customer',
            status
          })
          .execute(connection, false);
      }
    }
    await commit(connection);
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
