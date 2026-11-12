import { commit, insert, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { getConnection, pool } from '../../core.js';
import { isValidNationalNumber } from '../../lib/nationalNumber.js';
import { buildAttests, type BuildResult, type PayerShare } from './buildAttests.js';
import { collectAttestCandidates } from './collectAttestCandidates.js';
import { getFiscalAttestSettings, type FiscalAttestSettings } from './settings.js';

// Preview / generate the fiscal attests of an income year, and the admin
// edits that feed them (manual amounts, payer splits, customer split
// requests). core/.docs/fiscal-attests.md, Phase 3 + 7.

async function query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await (pool as any).query(sql, params);
  return result.rows as T[];
}

export interface PayerRequest {
  registrationId: number;
  participantName: string;
  productName: string;
  current: PayerShare[];
  requested: PayerShare[];
}

export interface FiscalAttestPreview extends BuildResult {
  year: number;
  settingsComplete: boolean;
  missingSettings: string[];
  maxDailyRate: number | null;
  existingFinalCount: number;
  blockingCount: number;
  warningCount: number;
  payerRequests: PayerRequest[];
}

function missingSettings(settings: FiscalAttestSettings): string[] {
  const missing: string[] = [];
  if (!settings.companyNumber) missing.push('company number');
  if (!settings.legalName) missing.push('legal name');
  if (!settings.address || !settings.postcode || !settings.city) missing.push('organiser address');
  if (!settings.authorityName) missing.push('recognising body');
  if (!settings.signatoryName) missing.push('signatory');
  return missing;
}

function toPayer(row: any): PayerShare {
  return {
    customerId: row.customer_id ?? null,
    fullName: row.full_name,
    nationalNumber: row.national_number ?? null,
    address: typeof row.address === 'string' ? JSON.parse(row.address) : row.address ?? {},
    sharePercent: Number(row.share_percent)
  };
}

export async function listPayerRequests(): Promise<PayerRequest[]> {
  const rows = await query(
    `SELECT fap.*, p.first_name, p.last_name, pd.name AS product_name
     FROM fiscal_attest_payer fap
     JOIN registration r ON r.registration_id = fap.registration_id
     JOIN participant p ON p.participant_id = r.registration_participant_id
     LEFT JOIN product_description pd ON pd.product_description_product_id = r.registration_product_id
     WHERE fap.registration_id IN (SELECT registration_id FROM fiscal_attest_payer WHERE status = 'requested')
     ORDER BY fap.registration_id, fap.fiscal_attest_payer_id`
  );
  const byRegistration = new Map<number, PayerRequest>();
  for (const row of rows) {
    const request =
      byRegistration.get(row.registration_id) ??
      ({
        registrationId: row.registration_id,
        participantName: `${row.first_name} ${row.last_name}`,
        productName: row.product_name ?? '',
        current: [],
        requested: []
      } as PayerRequest);
    (row.status === 'requested' ? request.requested : request.current).push(toPayer(row));
    byRegistration.set(row.registration_id, request);
  }
  return [...byRegistration.values()];
}

export async function previewFiscalAttests(year: number): Promise<FiscalAttestPreview> {
  const settings = await getFiscalAttestSettings();
  const maxDailyRate = settings.maxDailyRates.find((r) => r.year === year)?.amount ?? null;
  const collected = await collectAttestCandidates(year);
  const result = buildAttests(year, collected.candidates, { maxDailyRate });

  // Dated camps that are not marked eligible: listed so forgotten camps get noticed.
  for (const n of collected.notEligible) {
    result.issues.push({
      registrationId: n.registrationId,
      participantId: null,
      participantName: n.participantName,
      severity: 'warning',
      code: 'not_eligible',
      message: `${n.productName} is not marked eligible for a fiscal attest; left out`
    });
  }

  const [{ count }] = await query(
    `SELECT COUNT(*)::int AS count FROM fiscal_attest WHERE income_year = $1 AND status = 'final'`,
    [year]
  );
  const missing = missingSettings(settings);
  return {
    ...result,
    year,
    settingsComplete: missing.length === 0,
    missingSettings: missing,
    maxDailyRate,
    existingFinalCount: count,
    blockingCount: result.issues.filter((i) => i.severity === 'blocking').length,
    warningCount: result.issues.filter((i) => i.severity === 'warning').length,
    payerRequests: await listPayerRequests()
  };
}

/**
 * Write the year's attests as 'final' rows with fiche numbers. Refused when
 * the year already has final attests (use corrections), when the settings
 * are incomplete, or while there are blocking issues.
 */
export async function generateFiscalAttests(year: number): Promise<{ created: number }> {
  const preview = await previewFiscalAttests(year);
  if (preview.existingFinalCount > 0) {
    throw new Error(`The attests for ${year} were already generated; use corrections to change them`);
  }
  if (!preview.settingsComplete) {
    throw new Error(`Fill in the fiscal attest settings first: ${preview.missingSettings.join(', ')}`);
  }
  if (preview.blockingCount > 0) {
    throw new Error(`Solve the ${preview.blockingCount} blocking issue(s) first`);
  }
  if (preview.attests.length === 0) {
    throw new Error(`No attests to generate for ${year}`);
  }

  const settings = await getFiscalAttestSettings();
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const { rows } = await connection.query(
      `SELECT COALESCE(MAX(sequence_number), 0)::int AS max FROM fiscal_attest WHERE income_year = $1`,
      [year]
    );
    let sequence = rows[0].max;
    for (const attest of preview.attests) {
      sequence += 1;
      const data = {
        incomeYear: year,
        sequenceNumber: sequence,
        organiser: {
          companyNumber: settings.companyNumber,
          legalName: settings.legalName,
          address: settings.address,
          postcode: settings.postcode,
          city: settings.city
        },
        authority: {
          type: settings.authorityType,
          name: settings.authorityName,
          reference: settings.authorityReference
        },
        signatory: { name: settings.signatoryName, function: settings.signatoryFunction },
        child: attest.child,
        payer: attest.payer,
        periods: attest.periods,
        totalAmount: attest.totalAmount,
        totalDays: attest.totalDays,
        generatedAt: new Date().toISOString()
      };
      await insert('fiscal_attest')
        .given({
          income_year: year,
          sequence_number: sequence,
          participant_id: attest.child.participantId,
          customer_id: attest.payer.customerId,
          status: 'final',
          data: JSON.stringify(data),
          total_amount: attest.totalAmount,
          total_days: attest.totalDays
        })
        .execute(connection, false);
    }
    await commit(connection);
    return { created: preview.attests.length };
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/** Manual amount for a registration; null removes it. */
export async function saveAmountOverride(
  registrationId: number,
  amount: number | null,
  note: string | null
): Promise<void> {
  if (amount === null) {
    await query(`DELETE FROM fiscal_attest_amount_override WHERE registration_id = $1`, [registrationId]);
    return;
  }
  if (!(amount >= 0)) {
    throw new Error('Amount must be 0 or more');
  }
  await query(
    `INSERT INTO fiscal_attest_amount_override (registration_id, amount, note, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (registration_id) DO UPDATE SET amount = EXCLUDED.amount, note = EXCLUDED.note, updated_at = now()`,
    [registrationId, amount, note]
  );
}

/**
 * Admin: set the payers of one registration (empty/null = back to 100% the
 * order customer). Replaces the active rows; shares must add up to 100%.
 */
export async function saveRegistrationPayers(registrationId: number, payers: PayerShare[] | null): Promise<void> {
  const list = payers ?? [];
  if (list.length > 0) {
    const total = Math.round(list.reduce((sum, p) => sum + Number(p.sharePercent), 0) * 100) / 100;
    if (total !== 100) {
      throw new Error(`Shares must add up to 100% (now ${total}%)`);
    }
    for (const p of list) {
      if (!String(p.fullName ?? '').trim()) {
        throw new Error('Every payer needs a name');
      }
      const nn = String(p.nationalNumber ?? '').replace(/\D/g, '');
      if (nn && !isValidNationalNumber(nn)) {
        throw new Error(`Invalid national number for ${p.fullName}`);
      }
    }
  }
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    await connection.query(
      `DELETE FROM fiscal_attest_payer WHERE registration_id = $1 AND status = 'active'`,
      [registrationId]
    );
    for (const p of list) {
      await insert('fiscal_attest_payer')
        .given({
          registration_id: registrationId,
          customer_id: p.customerId ?? null,
          full_name: String(p.fullName).trim(),
          national_number: String(p.nationalNumber ?? '').replace(/\D/g, '') || null,
          address: JSON.stringify(p.address ?? {}),
          share_percent: Number(p.sharePercent),
          source: 'admin',
          status: 'active'
        })
        .execute(connection, false);
    }
    await commit(connection);
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Admin: approve or reject a customer's split request for a registration.
 * Approve makes the requested rows the active ones; the year's final attests
 * then need a correction (Stage 9, Phase 6).
 */
export async function reviewPayerRequest(registrationId: number, approve: boolean): Promise<void> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    if (approve) {
      await connection.query(
        `DELETE FROM fiscal_attest_payer WHERE registration_id = $1 AND status = 'active'`,
        [registrationId]
      );
      await connection.query(
        `UPDATE fiscal_attest_payer SET status = 'active' WHERE registration_id = $1 AND status = 'requested'`,
        [registrationId]
      );
    } else {
      await connection.query(
        `DELETE FROM fiscal_attest_payer WHERE registration_id = $1 AND status = 'requested'`,
        [registrationId]
      );
    }
    await commit(connection);
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
