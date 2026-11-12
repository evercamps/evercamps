import { commit, insert, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { getConnection } from '../../core.js';
import { cents, payerKey } from './buildAttests.js';
import { listFiches, pendingFiches, type FicheRow } from './batches.js';
import { chunkAttest, ficheFingerprint, toFicheData, type FicheData } from './fiches.js';
import { previewFiscalAttests } from './generateFiscalAttests.js';
import { getFiscalAttestSettings } from './settings.js';

// Corrections after the year's fiches were uploaded (core/.docs/fiscal-attests.md,
// Phase 6). The current build is compared with the current ('final') fiches
// by key (child + payer + chunk):
//   changed  -> modification: new row, same volgnummer, old row 'corrected'
//   new      -> addition: new row, next volgnummer
//   gone     -> cancellation: 'cancelled' row with the old content, old row 'corrected'
// The new rows are pending (batch_id NULL) until exported as a correction batch.

export interface CorrectionLine {
  type: 'modification' | 'addition' | 'cancellation';
  key: string;
  sequenceNumber: number | null; // null for an addition (assigned on commit)
  childName: string;
  payerName: string;
  oldAmount: number | null;
  newAmount: number | null;
  oldPeriods: string[];
  newPeriods: string[];
}

export interface CorrectionPreview {
  year: number;
  canCorrect: boolean;
  reason: string | null;
  lines: CorrectionLine[];
}

function keyOf(data: FicheData): string {
  // rows written before keys were stored: one chunk per child + payer
  return data.key ?? `${data.child.participantId}:${payerKey(data.payer)}#1`;
}

function periodLabels(data: Pick<FicheData, 'periods'> | null): string[] {
  return (data?.periods ?? []).map((p) => `${p.label} (${p.startDate} - ${p.endDate}): €${cents(p.amount).toFixed(2)}`);
}

interface Diff {
  line: CorrectionLine;
  old: FicheRow | null;
  chunk: ReturnType<typeof chunkAttest>[number] | null;
}

async function diff(year: number): Promise<{ preview: CorrectionPreview; diffs: Diff[] }> {
  const blocked = (reason: string) => ({ preview: { year, canCorrect: false, reason, lines: [] }, diffs: [] });
  const fiches = await listFiches(year);
  const current = fiches.filter((f) => f.status === 'final');
  if (current.length === 0) {
    return blocked(`The attests for ${year} were not generated yet`);
  }
  if ((await pendingFiches(year)).length > 0) {
    return blocked('There are fiches that were not exported yet: export or discard them first');
  }
  const build = await previewFiscalAttests(year);
  if (!build.settingsComplete) {
    return blocked(`Fill in the fiscal attest settings first: ${build.missingSettings.join(', ')}`);
  }
  if (build.blockingCount > 0) {
    // a blocked registration would otherwise look like a cancellation
    return blocked(`Solve the ${build.blockingCount} blocking issue(s) first`);
  }

  const settings = await getFiscalAttestSettings();
  const byKey = new Map(current.map((f) => [keyOf(f.data), f]));
  const diffs: Diff[] = [];
  const seen = new Set<string>();

  for (const chunk of build.attests.flatMap(chunkAttest)) {
    seen.add(chunk.key);
    const old = byKey.get(chunk.key) ?? null;
    const draft = toFicheData(chunk, settings, old?.sequenceNumber ?? 0, old ? 'modification' : 'addition');
    if (old && ficheFingerprint(old.data) === ficheFingerprint(draft)) {
      continue;
    }
    diffs.push({
      old,
      chunk,
      line: {
        type: old ? 'modification' : 'addition',
        key: chunk.key,
        sequenceNumber: old?.sequenceNumber ?? null,
        childName: `${chunk.child.firstName} ${chunk.child.lastName}`,
        payerName: chunk.payer.fullName,
        oldAmount: old?.totalAmount ?? null,
        newAmount: chunk.totalAmount,
        oldPeriods: periodLabels(old?.data ?? null),
        newPeriods: periodLabels(chunk)
      }
    });
  }
  for (const [key, old] of byKey) {
    if (seen.has(key)) continue;
    diffs.push({
      old,
      chunk: null,
      line: {
        type: 'cancellation',
        key,
        sequenceNumber: old.sequenceNumber,
        childName: `${old.data.child.firstName} ${old.data.child.lastName}`,
        payerName: old.data.payer.fullName,
        oldAmount: old.totalAmount,
        newAmount: null,
        oldPeriods: periodLabels(old.data),
        newPeriods: []
      }
    });
  }
  return { preview: { year, canCorrect: true, reason: null, lines: diffs.map((d) => d.line) }, diffs };
}

export async function previewCorrections(year: number): Promise<CorrectionPreview> {
  return (await diff(year)).preview;
}

export async function commitCorrections(year: number): Promise<{ modifications: number; additions: number; cancellations: number }> {
  const { preview, diffs } = await diff(year);
  if (!preview.canCorrect) {
    throw new Error(preview.reason ?? 'Corrections are not possible now');
  }
  if (diffs.length === 0) {
    throw new Error('Nothing changed since the last upload');
  }
  const settings = await getFiscalAttestSettings();
  const counts = { modifications: 0, additions: 0, cancellations: 0 };
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const { rows } = await connection.query(
      `SELECT COALESCE(MAX(sequence_number), 0)::int AS max FROM fiscal_attest WHERE income_year = $1`,
      [year]
    );
    let sequence = rows[0].max;

    for (const { old, chunk, line } of diffs) {
      if (old) {
        await connection.query(`UPDATE fiscal_attest SET status = 'corrected' WHERE fiscal_attest_id = $1`, [
          old.attestId
        ]);
      }
      if (line.type === 'cancellation' && old) {
        const data: FicheData = { ...old.data, key: line.key, changeType: 'cancellation', generatedAt: new Date().toISOString() };
        await insert('fiscal_attest')
          .given({
            income_year: year,
            sequence_number: old.sequenceNumber,
            participant_id: old.data.child.participantId,
            customer_id: old.customerId,
            status: 'cancelled',
            change_type: 'cancellation',
            replaces_attest_id: old.attestId,
            data: JSON.stringify(data),
            total_amount: old.totalAmount,
            total_days: old.totalDays
          })
          .execute(connection, false);
        counts.cancellations += 1;
        continue;
      }
      const number = old ? old.sequenceNumber : (sequence += 1);
      const data = toFicheData(chunk!, settings, number, line.type);
      await insert('fiscal_attest')
        .given({
          income_year: year,
          sequence_number: number,
          participant_id: chunk!.child.participantId,
          customer_id: chunk!.payer.customerId,
          status: 'final',
          change_type: line.type,
          replaces_attest_id: old?.attestId ?? null,
          data: JSON.stringify(data),
          total_amount: data.totalAmount,
          total_days: data.totalDays
        })
        .execute(connection, false);
      if (line.type === 'modification') counts.modifications += 1;
      else counts.additions += 1;
    }
    await commit(connection);
    return counts;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
