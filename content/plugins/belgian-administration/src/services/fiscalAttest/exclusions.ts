import { pool } from '../../core.js';

// "Don't generate a fiscal attest" for an order (all its registrations) or for
// a single registration without an order. core/.docs/fiscal-attests.md.

export const EXCLUSION_REASONS = {
  not_belgian: 'Not Belgian',
  organisation: 'Organisation',
  other: 'Other'
} as const;

export type ExclusionReason = keyof typeof EXCLUSION_REASONS;

export interface Exclusion {
  reason: ExclusionReason;
  reasonLabel: string;
  note: string | null;
  scope: 'order' | 'registration';
}

async function query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await (pool as any).query(sql, params);
  return result.rows as T[];
}

function toExclusion(row: any, scope: Exclusion['scope']): Exclusion {
  const reason = (row.reason in EXCLUSION_REASONS ? row.reason : 'other') as ExclusionReason;
  return { reason, reasonLabel: EXCLUSION_REASONS[reason], note: row.note ?? null, scope };
}

export async function getOrderExclusion(orderId: number): Promise<Exclusion | null> {
  const [row] = await query(`SELECT * FROM fiscal_attest_exclusion WHERE order_id = $1`, [orderId]);
  return row ? toExclusion(row, 'order') : null;
}

/** Exclusions for these orders/registrations: registrationId -> exclusion. */
export async function loadExclusions(
  registrations: { registrationId: number; orderId: number | null }[]
): Promise<Map<number, Exclusion>> {
  const result = new Map<number, Exclusion>();
  if (registrations.length === 0) {
    return result;
  }
  const orderIds = [...new Set(registrations.map((r) => r.orderId).filter((id): id is number => !!id))];
  const rows = await query(
    `SELECT * FROM fiscal_attest_exclusion WHERE order_id = ANY($1) OR registration_id = ANY($2)`,
    [orderIds, registrations.map((r) => r.registrationId)]
  );
  for (const r of registrations) {
    const byRegistration = rows.find((row) => row.registration_id === r.registrationId);
    const byOrder = r.orderId ? rows.find((row) => row.order_id === r.orderId) : undefined;
    if (byRegistration) {
      result.set(r.registrationId, toExclusion(byRegistration, 'registration'));
    } else if (byOrder) {
      result.set(r.registrationId, toExclusion(byOrder, 'order'));
    }
  }
  return result;
}

/**
 * Exclude (or include again) an order, or a registration without an order.
 */
export async function setExclusion(input: {
  orderId?: number | null;
  registrationId?: number | null;
  excluded: boolean;
  reason?: string;
  note?: string | null;
}): Promise<void> {
  const orderId = input.orderId ? Number(input.orderId) : null;
  const registrationId = !orderId && input.registrationId ? Number(input.registrationId) : null;
  if (!orderId && !registrationId) {
    throw new Error('An order or a registration is required');
  }
  const column = orderId ? 'order_id' : 'registration_id';
  const id = orderId ?? registrationId;
  if (!input.excluded) {
    await query(`DELETE FROM fiscal_attest_exclusion WHERE ${column} = $1`, [id]);
    return;
  }
  const reason = input.reason && input.reason in EXCLUSION_REASONS ? input.reason : 'other';
  await query(
    `INSERT INTO fiscal_attest_exclusion (${column}, reason, note) VALUES ($1, $2, $3)
     ON CONFLICT (${column}) DO UPDATE SET reason = EXCLUDED.reason, note = EXCLUDED.note`,
    [id, reason, input.note ? String(input.note).trim() || null : null]
  );
}
