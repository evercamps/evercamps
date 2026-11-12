import { commit, insert, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { getConnection, pool } from '../../core.js';
import { buildBelcotaxXml, type BelcotaxEnvironment } from './belcotax/xml.js';
import type { FicheData } from './fiches.js';
import { getFiscalAttestSettings } from './settings.js';

// Belcotax uploads (core/.docs/fiscal-attests.md, Phase 5/6). Rows of
// fiscal_attest with batch_id NULL (status 'final' or 'cancelled') are the
// fiches still to upload. A production export writes a fiscal_attest_batch
// with the XML and links them; a test export (BELCOTST) only returns the XML.

async function query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await (pool as any).query(sql, params);
  return result.rows as T[];
}

export type BatchStatus = 'exported' | 'submitted' | 'accepted' | 'rejected';

export interface BatchSummary {
  batchId: number;
  uuid: string;
  incomeYear: number;
  kind: string;
  status: BatchStatus;
  belcotaxReference: string | null;
  createdAt: string;
  submittedAt: string | null;
  ficheCount: number;
  totalAmount: number;
}

export interface FicheRow {
  attestId: number;
  uuid: string;
  sequenceNumber: number;
  status: 'final' | 'corrected' | 'cancelled';
  changeType: FicheData['changeType'];
  batchId: number | null;
  replacesAttestId: number | null;
  customerId: number | null;
  totalAmount: number;
  totalDays: number;
  createdAt: string;
  data: FicheData;
}

function toFicheRow(row: any): FicheRow {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  return {
    attestId: row.fiscal_attest_id,
    uuid: row.uuid,
    sequenceNumber: row.sequence_number,
    status: row.status,
    changeType: row.change_type,
    batchId: row.batch_id,
    replacesAttestId: row.replaces_attest_id,
    customerId: row.customer_id,
    totalAmount: Number(row.total_amount),
    totalDays: Number(row.total_days),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    // older rows (before fiches.ts) have no changeType / sequenceNumber in data
    data: { ...data, sequenceNumber: row.sequence_number, changeType: row.change_type }
  };
}

/** All fiche rows of a year (current, replaced and cancellations). */
export async function listFiches(year: number): Promise<FicheRow[]> {
  const rows = await query(
    `SELECT * FROM fiscal_attest WHERE income_year = $1 ORDER BY sequence_number, fiscal_attest_id`,
    [year]
  );
  return rows.map(toFicheRow);
}

export async function getFiche(uuid: string): Promise<FicheRow | null> {
  const rows = await query(`SELECT * FROM fiscal_attest WHERE uuid = $1`, [uuid]);
  return rows[0] ? toFicheRow(rows[0]) : null;
}

/** Fiches that still have to be uploaded. */
export async function pendingFiches(year: number): Promise<FicheRow[]> {
  const rows = await query(
    `SELECT * FROM fiscal_attest
     WHERE income_year = $1 AND batch_id IS NULL AND status IN ('final', 'cancelled')
     ORDER BY sequence_number`,
    [year]
  );
  return rows.map(toFicheRow);
}

export async function listBatches(year: number): Promise<BatchSummary[]> {
  const rows = await query(
    `SELECT b.*, COUNT(fa.fiscal_attest_id)::int AS fiche_count, COALESCE(SUM(fa.total_amount), 0) AS total_amount
     FROM fiscal_attest_batch b
     LEFT JOIN fiscal_attest fa ON fa.batch_id = b.fiscal_attest_batch_id
     WHERE b.income_year = $1
     GROUP BY b.fiscal_attest_batch_id
     ORDER BY b.fiscal_attest_batch_id DESC`,
    [year]
  );
  return rows.map((b) => ({
    batchId: b.fiscal_attest_batch_id,
    uuid: b.uuid,
    incomeYear: b.income_year,
    kind: b.kind,
    status: b.status,
    belcotaxReference: b.belcotax_reference,
    createdAt: b.created_at instanceof Date ? b.created_at.toISOString() : String(b.created_at),
    submittedAt: b.submitted_at ? new Date(b.submitted_at).toISOString() : null,
    ficheCount: b.fiche_count,
    totalAmount: Number(b.total_amount)
  }));
}

async function senderFromSettings() {
  const s = await getFiscalAttestSettings();
  return {
    companyNumber: s.companyNumber,
    legalName: s.legalName,
    address: s.address,
    postcode: s.postcode,
    city: s.city,
    contactName: s.senderContactName || s.signatoryName,
    contactEmail: s.senderContactEmail,
    contactPhone: s.senderContactPhone
  };
}

/** Is the next upload of this year the first one (v0025 = 0)? */
async function isFirstUpload(year: number): Promise<boolean> {
  const [{ count }] = await query(
    `SELECT COUNT(*)::int AS count FROM fiscal_attest_batch WHERE income_year = $1 AND status <> 'rejected'`,
    [year]
  );
  return count === 0;
}

/**
 * Export the pending fiches of a year. 'test' returns a BELCOTST file and
 * changes nothing; 'production' creates the batch and links the fiches.
 */
export async function exportBatch(
  year: number,
  environment: BelcotaxEnvironment
): Promise<{ xml: string; fileName: string; batchUuid: string | null; ficheCount: number }> {
  const fiches = await pendingFiches(year);
  if (fiches.length === 0) {
    throw new Error(`Nothing to export for ${year}`);
  }
  const sender = await senderFromSettings();
  if (!sender.companyNumber || !sender.legalName) {
    throw new Error('Fill in the organiser in the fiscal attest settings first');
  }
  const first = await isFirstUpload(year);
  const xml = buildBelcotaxXml({
    incomeYear: year,
    environment,
    sendType: first ? 'original' : 'correction',
    sender,
    fiches: fiches.map((f) => f.data)
  });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const fileName = `belcotax-28186-${year}-${environment === 'production' ? '' : 'test-'}${stamp}.xml`;
  if (environment === 'test') {
    return { xml, fileName, batchUuid: null, ficheCount: fiches.length };
  }

  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const batch = await insert('fiscal_attest_batch')
      .given({
        income_year: year,
        kind: first ? 'original' : fiches.every((f) => f.changeType === 'cancellation') ? 'cancellation' : 'correction',
        status: 'exported',
        xml_file: xml
      })
      .execute(connection, false);
    await connection.query(
      `UPDATE fiscal_attest SET batch_id = $1 WHERE fiscal_attest_id = ANY($2) AND batch_id IS NULL`,
      [batch.fiscal_attest_batch_id, fiches.map((f) => f.attestId)]
    );
    await commit(connection);
    return { xml, fileName, batchUuid: batch.uuid, ficheCount: fiches.length };
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export async function getBatchXml(uuid: string): Promise<{ xml: string; fileName: string }> {
  const rows = await query(`SELECT * FROM fiscal_attest_batch WHERE uuid = $1`, [uuid]);
  if (!rows[0] || !rows[0].xml_file) {
    throw new Error('Batch not found');
  }
  return {
    xml: rows[0].xml_file,
    fileName: `belcotax-28186-${rows[0].income_year}-batch-${rows[0].fiscal_attest_batch_id}.xml`
  };
}

/**
 * Record what Belcotax-on-web said. A rejected batch releases its fiches, so
 * they're exported again with the next batch.
 */
export async function updateBatchStatus(uuid: string, status: BatchStatus, reference: string | null): Promise<void> {
  if (!['exported', 'submitted', 'accepted', 'rejected'].includes(status)) {
    throw new Error('Invalid status');
  }
  const rows = await query(`SELECT * FROM fiscal_attest_batch WHERE uuid = $1`, [uuid]);
  const batch = rows[0];
  if (!batch) {
    throw new Error('Batch not found');
  }
  if (batch.status === 'rejected' && status !== 'rejected') {
    throw new Error('A rejected batch cannot be reopened; export a new one');
  }
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    await connection.query(
      `UPDATE fiscal_attest_batch
       SET status = $2, belcotax_reference = COALESCE($3, belcotax_reference),
           submitted_at = CASE WHEN $2 IN ('submitted', 'accepted') THEN COALESCE(submitted_at, now()) ELSE submitted_at END
       WHERE fiscal_attest_batch_id = $1`,
      [batch.fiscal_attest_batch_id, status, reference || null]
    );
    if (status === 'rejected') {
      await connection.query(`UPDATE fiscal_attest SET batch_id = NULL WHERE batch_id = $1`, [
        batch.fiscal_attest_batch_id
      ]);
    }
    await commit(connection);
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Undo everything of a year that wasn't uploaded yet: delete the pending
 * rows and make the fiches they replaced current again. With nothing
 * uploaded yet, this removes the generated attests so they can be generated
 * again.
 */
export async function discardPending(year: number): Promise<{ discarded: number }> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const { rows } = await connection.query(
      `DELETE FROM fiscal_attest
       WHERE income_year = $1 AND batch_id IS NULL AND status IN ('final', 'cancelled')
       RETURNING replaces_attest_id`,
      [year]
    );
    const restore = rows.map((r: any) => r.replaces_attest_id).filter(Boolean);
    if (restore.length > 0) {
      await connection.query(
        `UPDATE fiscal_attest SET status = 'final' WHERE fiscal_attest_id = ANY($1) AND status = 'corrected'`,
        [restore]
      );
    }
    await commit(connection);
    return { discarded: rows.length };
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
