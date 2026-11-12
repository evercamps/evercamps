import { buildUrl, pool } from '../../core.js';

// The fiscal attests a customer can download from their account
// (core/.docs/fiscal-attests.md, Phase 4). Only current fiches that were
// uploaded to Belcotax (batch_id set), so a discarded draft never shows up.

export interface CustomerFiscalAttest {
  uuid: string;
  incomeYear: number;
  sequenceNumber: number;
  childName: string;
  totalAmount: number;
  downloadUrl: string;
}

export async function listCustomerAttests(customerId: number): Promise<CustomerFiscalAttest[]> {
  const { rows } = await (pool as any).query(
    `SELECT uuid, income_year, sequence_number, total_amount, data
     FROM fiscal_attest
     WHERE customer_id = $1 AND status = 'final' AND batch_id IS NOT NULL
     ORDER BY income_year DESC, sequence_number`,
    [customerId]
  );
  return rows.map((row: any) => {
    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return {
      uuid: row.uuid,
      incomeYear: row.income_year,
      sequenceNumber: row.sequence_number,
      childName: `${data?.child?.firstName ?? ''} ${data?.child?.lastName ?? ''}`.trim(),
      totalAmount: Number(row.total_amount),
      downloadUrl: buildUrl('downloadMyFiscalAttest', { uuid: row.uuid })
    };
  });
}

/** The fiche's data when it belongs to this customer, else null. */
export async function getCustomerAttest(customerId: number, uuid: string): Promise<any | null> {
  const { rows } = await (pool as any).query(
    `SELECT data, sequence_number, change_type FROM fiscal_attest
     WHERE uuid = $1 AND customer_id = $2 AND status = 'final' AND batch_id IS NOT NULL`,
    [uuid, customerId]
  );
  if (!rows[0]) return null;
  const data = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
  return { ...data, sequenceNumber: rows[0].sequence_number, changeType: rows[0].change_type };
}
